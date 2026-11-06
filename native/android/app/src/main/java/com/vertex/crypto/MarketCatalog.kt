package com.vertex.crypto

/** Native Home widget selection matches every group in Vertex's verified quote feed. */
data class MarketInstrument(
 val id: String,
 val name: String,
 val category: String,
 val feedGroup: String
)

object MarketCatalog {
 private fun group(category: String, feedGroup: String, assets: List<Pair<String, String>>) =
  assets.map { (id, name) -> MarketInstrument(id, name, category, feedGroup) }

 val entries: List<MarketInstrument> =
  group("Crypto", "crypto", CoinCatalog.entries) +
  group("Indici", "markets", listOf(
   "sp500" to "S&P 500", "nasdaq" to "Nasdaq Composite",
   "tsx" to "S&P/TSX Composite", "ibov" to "Ibovespa",
   "ftse" to "FTSE 100", "dax" to "DAX", "cac" to "CAC 40",
   "jse" to "FTSE/JSE All Share", "tadawul" to "Tadawul All Share",
   "nikkei" to "Nikkei 225", "hsi" to "Hang Seng",
   "nifty" to "Nifty 50", "kospi" to "KOSPI", "asx" to "S&P/ASX 200"
  )) +
  group("Tech", "markets", listOf(
   "ndx" to "Nasdaq-100", "sox" to "PHLX SOX",
   "xlk" to "Technology Select Sector SPDR (XLK)",
   "qqq" to "Invesco QQQ", "smh" to "VanEck Semiconductor (SMH)"
  )) +
  group("Big Tech", "bigtech", listOf(
   "nvda" to "NVIDIA", "msft" to "Microsoft", "aapl" to "Apple",
   "googl" to "Alphabet", "amzn" to "Amazon", "meta" to "Meta",
   "tsla" to "Tesla", "avgo" to "Broadcom", "amd" to "AMD",
   "orcl" to "Oracle", "tsm" to "TSMC", "asml" to "ASML"
  )) +
  group("Materie prime", "commodities", listOf(
   "gold" to "Oro", "silver" to "Argento", "brent" to "Petrolio Brent",
   "wti" to "Petrolio WTI", "naturalgas" to "Gas naturale", "copper" to "Rame"
  )) +
  group("Forex", "forex", listOf(
   "eurusd" to "EUR/USD", "gbpusd" to "GBP/USD",
   "usdjpy" to "USD/JPY", "usdchf" to "USD/CHF",
   "audusd" to "AUD/USD", "usdcny" to "USD/CNY"
  )) +
  group("ETF / ETP", "etfs", listOf(
   "etf-ibit" to "IBIT · Bitcoin ETF",
   "etf-etha" to "ETHA · Ethereum ETF",
   "etf-bsol" to "BSOL · Solana ETF",
   "etf-ainj" to "AINJ · Injective ETP"
  ))

 val byId: Map<String, MarketInstrument> = entries.associateBy { it.id }
 val names: Map<String, String> = entries.associate { it.id to it.name }
 val groups: List<String> = listOf("crypto", "markets", "bigtech", "commodities", "forex", "etfs")
}
