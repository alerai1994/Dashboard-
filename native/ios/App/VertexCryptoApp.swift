import SwiftUI
import WidgetKit
import Foundation

private struct Feed: Decodable { let crypto: [CryptoQuote] }
private struct CryptoQuote: Decodable, Identifiable {
 let id: String
 let symbol: String?
 let value: Double?
 let change: Double?
 let time: String?
 let source: String?
}

@MainActor
final class VertexMarkets: ObservableObject {
 @Published var quotes: [CryptoQuote] = []
 @Published var isLoading = false
 @Published var status = "Caricamento quotazioni…"
 @Published var lastUpdate: Date?

 func refresh() async {
  guard !isLoading else { return }
  isLoading = true
  defer { isLoading = false }
  do {
   let url = URL(string: "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json")!
   var request = URLRequest(url: url)
   request.cachePolicy = .reloadIgnoringLocalCacheData
   request.timeoutInterval = 12
   let (data, response) = try await URLSession.shared.data(for: request)
   guard (response as? HTTPURLResponse)?.statusCode == 200
    else { throw URLError(.badServerResponse) }
   let feed = try JSONDecoder().decode(Feed.self, from: data)
   guard !feed.crypto.isEmpty else { throw URLError(.cannotParseResponse) }
   quotes = feed.crypto
   lastUpdate = Date()
   status = "\(feed.crypto.count) criptovalute caricate · possibili ritardi della fonte"
   // WidgetKit controls its own scheduling even after this refresh request.
   WidgetCenter.shared.reloadAllTimelines()
  } catch {
   status = quotes.isEmpty ?
    "Feed temporaneamente non disponibile. Nessun valore inventato." :
    "Connessione non disponibile: mostro le ultime quotazioni verificate."
  }
 }
}

private struct MarketRow: View {
 let quote: CryptoQuote
 var body: some View {
  HStack(spacing: 12) {
   VStack(alignment: .leading, spacing: 4) {
    Text(quote.id.uppercased()).font(.headline)
    Text(quote.source ?? "Fonte non disponibile")
     .font(.caption).foregroundStyle(.secondary).lineLimit(1)
   }
   Spacer(minLength: 10)
   VStack(alignment: .trailing, spacing: 4) {
    if let price = quote.value, price.isFinite, price > 0 {
     Text(price.formatted(.currency(code: "USD")
      .precision(.fractionLength(price < 1 ? 6 : 2))))
      .font(.headline.monospacedDigit()).lineLimit(1)
    } else { Text("—") }
    if let change = quote.change, change.isFinite {
     Text(String(format: "%+.2f%%", change))
      .font(.caption.bold())
      .foregroundStyle(change < 0 ? Color.red : Color.green)
    } else { Text("—").font(.caption) }
   }
  }
  .padding(.vertical, 6)
 }
}

private struct MarketDetails: View {
 let quote: CryptoQuote
 var body: some View {
  ScrollView {
   VStack(alignment: .leading, spacing: 20) {
    Text(quote.id.uppercased()).font(.largeTitle.bold())
    if let price=quote.value, price.isFinite, price>0 {
     Text(price.formatted(.currency(code: "USD")
      .precision(.fractionLength(price < 1 ? 6 : 2))))
      .font(.largeTitle.monospacedDigit())
    } else {
     Text("Quotazione non disponibile").font(.title2)
    }
    if let change=quote.change, change.isFinite {
     Text(String(format: "24h: %+.2f%%", change))
      .foregroundStyle(change < 0 ? .red : .green)
    }
    LabeledContent("Fonte", value: quote.source ?? "Non disponibile")
    LabeledContent("Orario del dato", value: quote.time ?? "Non disponibile")
    Text("Per aggiungere questo mercato alla schermata Home: tieni premuta la Home, scegli Widget → Vertex Crypto, poi modifica la criptovaluta.")
     .font(.footnote).foregroundStyle(.secondary)
    Text("Le quotazioni possono essere ritardate.")
     .font(.footnote).foregroundStyle(.secondary)
   }.frame(maxWidth: 550, alignment: .leading).padding(24)
  }.navigationTitle("Dettaglio crypto")
 }
}

struct VertexHostView: View {
 @StateObject private var market = VertexMarkets()
 @State private var search = ""
 @State private var showFavoritesOnly = false
 @AppStorage("vertex_favorite_coin_ids") private var favoriteIds = "btc,eth,sol"

 private var favorites: Set<String> {
  Set(favoriteIds.split(separator: ",").map(String.init))
 }
 private var filtered: [CryptoQuote] {
  let needle=search.trimmingCharacters(in:.whitespacesAndNewlines)
  return market.quotes.filter { quote in
   (!showFavoritesOnly || favorites.contains(quote.id)) &&
   (needle.isEmpty || quote.id.localizedCaseInsensitiveContains(needle) ||
    (quote.symbol?.localizedCaseInsensitiveContains(needle) ?? false))
  }.sorted { a,b in
   if favorites.contains(a.id) != favorites.contains(b.id) {
    return favorites.contains(a.id)
   }
   return a.id < b.id
  }
 }

 private func toggleFavorite(_ id:String){
  var all=favorites
  if !all.insert(id).inserted { all.remove(id) }
  favoriteIds=all.sorted().joined(separator:",")
 }

 var body: some View {
  NavigationStack {
   List {
    Section {
     VStack(alignment:.leading,spacing:8) {
      Text("VERTEX CRYPTO").font(.title.bold())
      Text("Mercati e widget nativi per la schermata Home")
       .foregroundStyle(.secondary)
      Text(market.status).font(.caption).foregroundStyle(.secondary)
     }.padding(.vertical,8)
    }
    Section("Criptovalute") {
     if market.isLoading && market.quotes.isEmpty { ProgressView("Caricamento…") }
     ForEach(filtered) { quote in
      HStack {
       NavigationLink { MarketDetails(quote:quote) } label: {
        MarketRow(quote:quote)
       }
       Button {
        toggleFavorite(quote.id)
       } label: {
        Image(systemName:favorites.contains(quote.id) ? "star.fill" : "star")
       }
       .buttonStyle(.borderless)
       .accessibilityLabel(favorites.contains(quote.id) ?
        "Rimuovi dai preferiti" : "Aggiungi ai preferiti")
      }
     }
    }
    Section("Widget del dispositivo") {
     Text("Tieni premuto sulla schermata Home → Aggiungi widget → Vertex Crypto. " +
      "Tieni premuto sul widget → Modifica widget per scegliere una moneta.")
     Text("I widget possono essere aggiornati meno frequentemente dell'app, secondo le regole del sistema.")
      .font(.footnote).foregroundStyle(.secondary)
    }
   }
   .navigationTitle("Vertex")
   .searchable(text:$search,prompt:"Cerca una criptovaluta")
   .toolbar {
    ToolbarItem {
     Button(showFavoritesOnly ? "Tutte" : "Preferite"){
      showFavoritesOnly.toggle()
     }
    }
    ToolbarItem {
     Button {
      Task { await market.refresh() }
     } label: {
      Label("Aggiorna",systemImage:"arrow.clockwise")
     }
     .disabled(market.isLoading)
    }
   }
   .refreshable { await market.refresh() }
   .task { await market.refresh() }
  }
 }
}

@main
struct VertexCryptoApp: App {
 var body: some Scene {
  WindowGroup { VertexHostView() }
 }
}
