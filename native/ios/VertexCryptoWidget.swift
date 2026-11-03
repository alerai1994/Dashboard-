import WidgetKit
import SwiftUI
import AppIntents

// WidgetKit requires a native iOS/iPadOS host app + widget-extension target.
// Add this file to the Widget Extension target in Xcode.
enum VertexCoin: String, AppEnum, CaseIterable {
 case btc, eth, sol, xrp, bnb, doge, inj, ore, ada, avax, link, dot, trx, ton, sui, ltc, bch, xlm, hbar, near, apt, atom, uni, aave, arb, op, shib, pepe, render, ray, lunc, vra, wlfi, hot, ksm, wld, fet, orai, tai, virtual, tao, luna
 static var typeDisplayRepresentation: TypeDisplayRepresentation = "Criptovaluta"
 static var caseDisplayRepresentations: [VertexCoin: DisplayRepresentation] = [
  .btc: "Bitcoin (BTC)",
  .eth: "Ethereum (ETH)",
  .sol: "Solana (SOL)",
  .xrp: "XRP",
  .bnb: "BNB",
  .doge: "Dogecoin (DOGE)",
  .inj: "Injective (INJ)",
  .ore: "ORE Protocol (ORE)",
  .ada: "Cardano (ADA)",
  .avax: "Avalanche (AVAX)",
  .link: "Chainlink (LINK)",
  .dot: "Polkadot (DOT)",
  .trx: "TRON (TRX)",
  .ton: "Toncoin (TON)",
  .sui: "Sui (SUI)",
  .ltc: "Litecoin (LTC)",
  .bch: "Bitcoin Cash (BCH)",
  .xlm: "Stellar (XLM)",
  .hbar: "Hedera (HBAR)",
  .near: "NEAR Protocol (NEAR)",
  .apt: "Aptos (APT)",
  .atom: "Cosmos (ATOM)",
  .uni: "Uniswap (UNI)",
  .aave: "Aave (AAVE)",
  .arb: "Arbitrum (ARB)",
  .op: "Optimism (OP)",
  .shib: "Shiba Inu (SHIB)",
  .pepe: "Pepe (PEPE)",
  .render: "Render (RENDER)",
  .ray: "Raydium (RAY)",
  .lunc: "Terra Luna Classic (LUNC)",
  .vra: "Verasity (VRA)",
  .wlfi: "World Liberty Financial (WLFI)",
  .hot: "Holo (HOT)",
  .ksm: "Kusama (KSM)",
  .wld: "Worldcoin (WLD)",
  .fet: "Fetch.ai / Artificial Superintelligence Alliance (FET)",
  .orai: "Oraichain (ORAI)",
  .tai: "TARS AI (TAI)",
  .virtual: "Virtuals Protocol (VIRTUAL)",
  .tao: "Bittensor (TAO)",
  .luna: "Terra (LUNA)"
 ]
}

struct SelectVertexCoinIntent: WidgetConfigurationIntent {
 static var title: LocalizedStringResource = "Crypto Vertex"
 static var description = IntentDescription("Scegli la criptovaluta da visualizzare.")
 @Parameter(title: "Criptovaluta") var coin: VertexCoin
 init() { self.coin = .btc }
}

private struct QuoteFeed: Decodable { let crypto: [CryptoRecord] }
private struct CryptoRecord: Decodable {
 let id: String
 let value: Double?
 let change: Double?
 let time: String?
 let source: String?
}

struct VertexEntry: TimelineEntry {
 let date: Date
 let coin: VertexCoin
 let price: Double?
 let change: Double?
 let source: String?
 let quoteTime: String?
}

struct VertexProvider: AppIntentTimelineProvider {
 typealias Entry = VertexEntry
 typealias Intent = SelectVertexCoinIntent
 func placeholder(in context: Context) -> Entry {
  Entry(date: .now, coin: .btc, price: nil, change: nil, source: nil, quoteTime: nil)
 }
 func snapshot(for configuration: Intent, in context: Context) async -> Entry {
  await load(configuration: configuration)
 }
 func timeline(for configuration: Intent, in context: Context) async -> Timeline<Entry> {
  let entry = await load(configuration: configuration)
  // WidgetKit may defer this request to conserve power.
  return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60)))
 }
 private func load(configuration: Intent) async -> Entry {
  let url = URL(string: "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json")!
  do {
   var request = URLRequest(url: url)
   request.cachePolicy = .reloadIgnoringLocalCacheData
   request.timeoutInterval = 12
   let (data, response) = try await URLSession.shared.data(for: request)
   guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
   let record = try JSONDecoder().decode(QuoteFeed.self, from: data).crypto.first { $0.id == configuration.coin.rawValue }
   return Entry(date: .now, coin: configuration.coin, price: record?.value,
                change: record?.change, source: record?.source, quoteTime: record?.time)
  } catch {
   return Entry(date: .now, coin: configuration.coin, price: nil,
                change: nil, source: nil, quoteTime: nil)
  }
 }
}

struct VertexCryptoWidgetView: View {
 let entry: VertexEntry
 private var priceText: String {
  guard let value = entry.price, value.isFinite, value > 0 else { return "—" }
  return value.formatted(.currency(code: "USD").precision(.fractionLength(value < 1 ? 6 : 2)))
 }
 private var changeText: String {
  guard let change = entry.change, change.isFinite else { return "—" }
  return String(format: "%+.2f%%", change)
 }
 var body: some View {
  VStack(alignment: .leading, spacing: 10) {
   Text("VERTEX").font(.caption.bold()).foregroundStyle(.cyan)
   Text(entry.coin.rawValue.uppercased()).font(.headline)
   Text(priceText).font(.title2.bold()).minimumScaleFactor(0.7).lineLimit(1)
   Text(changeText).font(.subheadline.bold())
    .foregroundStyle((entry.change ?? 0) < 0 ? .red : .green)
   Spacer(minLength: 0)
   Text(entry.quoteTime.map { "Dato: " + $0.prefix(16).replacingOccurrences(of: "T", with: " ") + " UTC" } ?? "Quotazione non disponibile")
    .font(.caption2).foregroundStyle(.secondary).lineLimit(2)
   Text(entry.source ?? "Vertex").font(.caption2).foregroundStyle(.secondary).lineLimit(1)
  }
  .padding(12)
  .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  .containerBackground(for: .widget) { Color(red: 0.04, green: 0.1, blue: 0.17) }
  .foregroundStyle(.white)
 }
}

struct VertexCryptoWidget: Widget {
 let kind = "com.vertex.crypto.quote"
 var body: some WidgetConfiguration {
  AppIntentConfiguration(kind: kind,
                         intent: SelectVertexCoinIntent.self,
                         provider: VertexProvider()) { entry in
   VertexCryptoWidgetView(entry: entry)
  }
  .configurationDisplayName("Vertex Crypto")
  .description("Scegli una criptovaluta e visualizzane prezzo e variazione.")
  .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
 }
}

@main
struct VertexWidgetBundle: WidgetBundle {
 var body: some Widget { VertexCryptoWidget() }
}
