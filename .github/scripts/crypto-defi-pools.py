#!/usr/bin/env python3
"""Read-only Vertex DeFi pool snapshots for the existing 288 crypto identities.

AMM pools are NOT a central limit order book. Never fabricate BID, ASK, depth,
price impact or executable quotes from TVL. No token-symbol search is accepted:
contract addresses must match CoinGecko's exact catalog coin ID and chain.
PancakeSwap V1/V2/V3/V4 labels must be explicit in upstream metadata.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
import json
import math
import re
import sys
import time

SPEC = spec_from_file_location("vertex_spot_registry", ".github/scripts/crypto-orderbooks-multisource.py")
spot = module_from_spec(SPEC)
SPEC.loader.exec_module(spot)
CATALOG = spot.catalog_with_ids()
assert len(CATALOG) == 288

OUTPUT = Path("crypto-defi-pools.json")
OUTPUT_JS = Path("crypto-defi-pools-data.js")
CHAIN_MAP = {
    "binance-smart-chain": "bsc",
    "ethereum": "ethereum",
    "base": "base",
    "solana": "solana",
}
POOL_GROUPS = ("pancake_v1", "pancake_v2", "pancake_v3",
               "pancake_v4", "pancake_other", "meteora", "raydium")
HEADERS = {"Accept": "application/json", "User-Agent": "VertexDeFiPools/1.0"}
MAX_AGE = 2 * 3600

def now():
    return datetime.now(timezone.utc)

def request_json(url, timeout=35):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=timeout) as response:
        return json.load(response)

def valid_address(chain, value):
    if not isinstance(value, str):
        return False
    if chain == "solana":
        return bool(re.fullmatch(r"[1-9A-HJ-NP-Za-km-z]{32,44}", value))
    return bool(re.fullmatch(r"0x[a-fA-F0-9]{40}", value))

def same_address(chain, a, b):
    return (a == b if chain == "solana" else
            str(a).lower() == str(b).lower())

def classify_dex(dex_id, labels, chain):
    dex = str(dex_id or "").lower()
    tags = " ".join([dex] + [str(x).lower() for x in labels if isinstance(x, str)])
    if "pancakeswap" in dex and chain in ("bsc", "ethereum", "base", "solana"):
        for version in ("v4", "v3", "v2", "v1"):
            if re.search(r"(?<![a-z0-9])" + version + r"(?![a-z0-9])", tags):
                return "pancake_" + version
        if "infinity" in tags or "infinity" in dex:
            return "pancake_v4"
        # Do not mislabel unversioned pools as v2 or as legacy v1.
        return "pancake_other"
    if chain == "solana" and "meteora" in dex:
        return "meteora"
    if chain == "solana" and "raydium" in dex:
        return "raydium"
    return None

def coin_contracts(rows):
    """Use ID-matched CoinGecko platform addresses, not same-symbol guesses."""
    if not isinstance(rows, list):
        raise ValueError("CoinGecko contract directory missing")
    by_id = {r.get("id"): r for r in rows if isinstance(r, dict)}
    result = {}
    for cid, (symbol, gecko_id, _) in CATALOG.items():
        record = by_id.get(gecko_id)
        if not record:
            continue
        platforms = record.get("platforms") or {}
        if not isinstance(platforms, dict):
            continue
        contracts = {}
        for upstream, chain in CHAIN_MAP.items():
            address = platforms.get(upstream)
            if valid_address(chain, address):
                contracts[chain] = address
        if contracts:
            result[cid] = contracts
    return result

def nonnegative(value):
    try:
        n = float(value)
        return round(n, 6) if math.isfinite(n) and n >= 0 else None
    except (ValueError, TypeError, OverflowError):
        return None

def accepted_pair(row, chain, token_address, captured_at):
    """Return only a source-identified, contract-matched, liquid pool."""
    if not isinstance(row, dict) or row.get("chainId") != chain:
        return None
    dex_id = row.get("dexId")
    labels = row.get("labels")
    group = classify_dex(dex_id, labels if isinstance(labels, list) else [], chain)
    if not group:
        return None
    base, quote_token = row.get("baseToken"), row.get("quoteToken")
    if not isinstance(base, dict) or not isinstance(quote_token, dict):
        return None
    base_match = same_address(chain, base.get("address"), token_address)
    quote_match = same_address(chain, quote_token.get("address"), token_address)
    if not (base_match or quote_match):
        return None
    # Both contract address and upstream pool identifier are required.
    pool_address = row.get("pairAddress")
    if chain == "solana":
        if not valid_address(chain, pool_address):
            return None
    elif not isinstance(pool_address, str) or not re.fullmatch(r"0x[0-9a-fA-F]{40,64}", pool_address):
        return None
    liquidity = nonnegative((row.get("liquidity") or {}).get("usd"))
    volume = nonnegative((row.get("volume") or {}).get("h24"))
    if liquidity is None or liquidity <= 0:
        return None
    price = nonnegative(row.get("priceUsd")) if base_match else None
    txns = (row.get("txns") or {}).get("h24") or {}
    def safe_count(key):
        value = txns.get(key)
        return int(value) if isinstance(value, int) and 0 <= value <= 1000000000 else None
    pool = {
        "group": group, "dex": str(dex_id), "chain": chain,
        "address": pool_address, "tokenAddress": token_address,
        "base": str(base.get("symbol") or "")[:30],
        "quote": str(quote_token.get("symbol") or "")[:30],
        "priceUsd": price, "liquidityUsd": liquidity, "volume24hUsd": volume,
        "buys24h": safe_count("buys"), "sells24h": safe_count("sells"),
        "capturedAt": captured_at, "source": "DEX Screener",
        "url": "https://dexscreener.com/" + chain + "/" + pool_address,
    }
    return pool

def unique_addresses(contracts):
    by_chain = {chain: {} for chain in set(CHAIN_MAP.values())}
    for cid, mapping in contracts.items():
        for chain, address in mapping.items():
            if chain not in by_chain or not valid_address(chain, address):
                continue
            key = address if chain == "solana" else address.lower()
            by_chain[chain].setdefault(key, set()).add(cid)
    return by_chain

def query_batch(chain, addresses):
    # Official DEX Screener endpoint: maximum 30 token addresses per request.
    url = "https://api.dexscreener.com/tokens/v1/" + chain + "/" + ",".join(
        quote(a, safe="") for a in addresses)
    results = request_json(url, timeout=28)
    if not isinstance(results, list):
        raise ValueError("DEX Screener token pairs response unavailable")
    return chain, addresses, results

def run():
    previous = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    contracts = previous.get("contracts", {}) if isinstance(previous.get("contracts"), dict) else {}
    got_directory = False
    try:
        directory = request_json(
            "https://api.coingecko.com/api/v3/coins/list?include_platform=true",
            timeout=55)
        resolved = coin_contracts(directory)
        if resolved:
            contracts = resolved
            got_directory = True
    except (OSError, ValueError, TypeError) as exc:
        print("CoinGecko platform lookup unavailable; keep prior ID-verified contracts:", type(exc).__name__)
    contract_index = unique_addresses(contracts)
    by_coin = {}
    checked = 0
    failed = 0
    tasks = []
    for chain, address_index in contract_index.items():
        addresses = list(address_index)
        for offset in range(0, len(addresses), 20):
            tasks.append((chain, addresses[offset:offset + 20]))
    print("Contract-matched addresses:", {k: len(v) for k, v in contract_index.items()},
          "DEX API batches:", len(tasks))
    with ThreadPoolExecutor(max_workers=4) as executor:
        jobs = {executor.submit(query_batch, chain, batch): (chain, batch)
                for chain, batch in tasks}
        for job in as_completed(jobs):
            try:
                chain, addresses, rows = job.result()
                checked += 1
            except (OSError, ValueError, TypeError) as exc:
                failed += 1
                continue
            seen_addresses = contract_index.get(chain, {})
            captured_at = now().isoformat()
            for row in rows:
                if not isinstance(row, dict):
                    continue
                for side in ("baseToken", "quoteToken"):
                    token = row.get(side)
                    addr = token.get("address") if isinstance(token, dict) else None
                    key = addr if chain == "solana" else str(addr).lower()
                    if key not in seen_addresses:
                        continue
                    # Contract matching is done BEFORE pool acceptance.
                    matched = accepted_pair(row, chain, addr, captured_at)
                    if matched:
                        for cid in seen_addresses[key]:
                            by_coin.setdefault(cid, []).append(matched)
    old_pools = previous.get("pools", {}) if isinstance(previous.get("pools"), dict) else {}
    timestamp = now().timestamp()
    for cid in CATALOG:
        rows = by_coin.get(cid, [])
        if not rows:
            # Preserve a previously verified observation only for a short window,
            # and mark it with its original timestamp. Never treat it as live.
            kept = []
            for row in old_pools.get(cid, []) if isinstance(old_pools.get(cid), list) else []:
                try:
                    age = timestamp - datetime.fromisoformat(row["capturedAt"].replace("Z", "+00:00")).timestamp()
                except (ValueError, KeyError, TypeError):
                    continue
                mapping = contracts.get(cid, {})
                if 0 <= age < MAX_AGE and mapping.get(row.get("chain")) and (
                    same_address(row["chain"], mapping[row["chain"]], row.get("tokenAddress"))
                ) and row.get("group") in POOL_GROUPS:
                    kept.append(row)
            rows = kept
        if not rows:
            continue
        # Keep diverse pool versions and both Solana DEXes, not only high-TVL V3.
        unique = {}
        for pool in rows:
            key = (pool["chain"], pool["address"], pool["group"])
            if key not in unique or pool["liquidityUsd"] > unique[key]["liquidityUsd"]:
                unique[key] = pool
        ordered = sorted(unique.values(), key=lambda x: x["liquidityUsd"], reverse=True)
        final = []
        for group in POOL_GROUPS:
            final.extend([x for x in ordered if x["group"] == group][:5])
        if final:
            by_coin[cid] = final
        else:
            by_coin.pop(cid, None)
    coverage = {
        "catalogAssets": len(CATALOG),
        "assetsWithPools": len(by_coin),
        "verifiedPoolSnapshots": sum(len(rows) for rows in by_coin.values()),
        "directoryChecked": got_directory,
        "dexBatchesSucceeded": checked, "dexBatchesFailed": failed,
    }
    payload = {
        "generatedAt": now().isoformat(),
        "totalAssets": len(CATALOG), "coverage": coverage,
        "contracts": contracts, "pools": by_coin,
        "note": "Pools AMM: liquidita e volumi osservati, NON order book BID/ASK",
    }
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    OUTPUT.write_text(encoded + "\n", encoding="utf-8")
    OUTPUT_JS.write_text("window.__VERTEX_DEFI_POOLS__ = " + encoded + ";\n",
                         encoding="utf-8")
    print("VERIFIED DEFI POOLS", json.dumps(coverage))

def selftest():
    assert len(CATALOG) == 288
    assert classify_dex("pancakeswap", ["V2"], "bsc") == "pancake_v2"
    assert classify_dex("pancakeswap-v3", [], "bsc") == "pancake_v3"
    assert classify_dex("pancakeswap", ["Infinity"], "bsc") == "pancake_v4"
    assert classify_dex("pancakeswap", [], "bsc") == "pancake_other"
    assert classify_dex("raydium", [], "solana") == "raydium"
    assert classify_dex("meteora", ["DLMM"], "solana") == "meteora"
    assert classify_dex("raydium", [], "ethereum") is None
    addr = "0x" + "a" * 40
    row = {
        "chainId": "bsc", "dexId": "pancakeswap", "labels": ["v2"],
        "pairAddress": "0x" + "b" * 40,
        "baseToken": {"address": addr, "symbol": "ABC"},
        "quoteToken": {"address": "0x" + "c" * 40, "symbol": "USDT"},
        "liquidity": {"usd": 10000},
        "volume": {"h24": 5000}, "priceUsd": "2.5",
        "txns": {"h24": {"buys": 2, "sells": 3}},
    }
    got = accepted_pair(row, "bsc", addr, now().isoformat())
    assert got and got["group"] == "pancake_v2" and got["priceUsd"] == 2.5
    assert not accepted_pair(row, "bsc", "0x" + "d"*40, now().isoformat())
    assert not accepted_pair({**row, "chainId": "ethereum"}, "bsc", addr, now().isoformat())
    assert not accepted_pair({**row, "dexId": "otherdex"}, "bsc", addr, now().isoformat())
    assert accepted_pair(row, "bsc", "0x" + "c"*40, now().isoformat())["priceUsd"] is None
    assert valid_address("solana", "So11111111111111111111111111111111111111112")
    print("PASS: strict ID->contract->chain->DEX->pool matching, no fake orderbook")

if __name__ == "__main__":
    selftest() if "--selftest" in sys.argv else run()
