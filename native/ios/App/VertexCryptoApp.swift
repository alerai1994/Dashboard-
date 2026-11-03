import SwiftUI
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
final class MarketModel: ObservableObject {
 @Published var quotes: [CryptoQuote] = []
 @Published var isLoading = false
 @Published var message = "Caricamento quotazioni…"
 func refresh() async {
  guard !isLoading else { return }
  isLoading = true
  defer { isLoading = false }
  do {
   let url = URL(string: "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json")!
   var request = URLRequest(url: url)
   request.cachePolicy = .reloadIgnoringLocalCacheData
   request.timeoutInterval = 15
   let (data, response) = try await URLSession.shared.data(for: request)
   guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
   let feed = try JSONDecoder().decode(Feed.self, from: data)
   quotes = feed.crypto
   message = "Ultimo aggiornamento ricevuto. Le quotazioni possono essere ritardate."
  } catch {
   message = "Feed temporaneamente non disponibile. Riprova più tardi."
  }
 }
}

struct VertexHostView: View {
 @StateObject private var model = MarketModel()
 var body: some View {
  NavigationStack {
   List {
    Section("Come aggiungere il widget") {
     Label("Tieni premuta la schermata Home", systemImage: "hand.point.up.left")
     Label("Apri Aggiungi widget e cerca Vertex Crypto", systemImage: "plus.square")
     Label("Tieni premuto il widget e scegli Modifica widget per cambiare crypto", systemImage: "slider.horizontal.3")
    }
    Section("Crypto disponibili") {
     ForEach(model.quotes) { quote in
      HStack {
       VStack(alignment: .leading) {
        Text(quote.id.uppercased()).font(.headline)
        Text(quote.source ?? "Fonte non disponibile").font(.caption).foregroundStyle(.secondary)
       }
       Spacer()
       VStack(alignment: .trailing) {
        if let price = quote.value, price.isFinite, price > 0 {
         Text(price.formatted(.currency(code: "USD").precision(.fractionLength(price < 1 ? 6 : 2))))
          .font(.subheadline.bold())
        } else {
         Text("—")
        }
        if let change = quote.change, change.isFinite {
         Text(String(format: "%+.2f%%", change))
          .font(.caption)
          .foregroundStyle(change < 0 ? Color.red : Color.green)
        }
       }
      }
     }
    }
    Section {
     Text(model.message).font(.footnote).foregroundStyle(.secondary)
     Link("Apri il progetto Vertex su GitHub",
          destination: URL(string: "https://github.com/alerai1994/Dashboard-")!)
    }
   }
   .navigationTitle("Vertex Crypto")
   .refreshable { await model.refresh() }
   .task { await model.refresh() }
  }
 }
}

@main
struct VertexCryptoApp: App {
 var body: some Scene {
  WindowGroup { VertexHostView() }
 }
}
