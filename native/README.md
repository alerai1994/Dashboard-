# Vertex Crypto — widget nativi per Android, iPhone/iPad e Windows 11

Questo repository contiene:
- **Android**: app Android con `AppWidgetProvider`, schermata di configurazione per 42 crypto, refresh e più widget indipendenti.
- **iOS/iPadOS**: app SwiftUI e target WidgetKit/App Intents che consente di modificare la crypto di ciascun widget.
- **Windows 11**: provider **nativo** Windows App SDK (.NET 8 / C# con registrazione COM tramite pacchetto MSIX) e, in alternativa, integrazione nella bacheca Widget dell'app PWA installata da Edge.
- **Web**: sezione `#widgets` per anteprime e selezione dei riquadri dentro Vertex (le scelte web non sincronizzano automaticamente le istanze native).

I tre sistemi leggono `market-quotes.json` verificato dal repository. Quando il feed non è aggiornato o irraggiungibile **non vengono inventati prezzi**. Il timestamp della fonte può essere precedente al momento del refresh.

## Android — installazione APK

1. Nel repository apri **Actions → Build native device widgets**. Se il job Android è riuscito, scarica l'artifact **vertex-crypto-android-debug-apk**: contiene `app-debug.apk` da installare sul tuo telefono Android; per produzione, firma un APK/AAB con la tua chiave.
2. In alternativa, apri `native/android` in Android Studio (JDK 17, SDK 35, Gradle 8.11.1), sincronizza ed esegui `app` sul telefono.
3. Tieni premuta la schermata Home → **Widget** → **Vertex Crypto** → trascina il riquadro.
4. Nella schermata di configurazione seleziona una delle **42 crypto**, compresa **ORE Protocol**. Tocca il nome del widget per cambiare crypto o ↻ per richiedere un nuovo prezzo. Puoi inserire più widget.
5. L'aggiornamento periodico richiesto è 30 minuti, ma il sistema può ritardarlo. Serve una connessione e le quotazioni possono essere ritardate.

## iOS / iPadOS — installazione dell'app e del widget

Per installare su un vero iPad serve **macOS con Xcode**, un'identità Apple per la firma e un dispositivo compatibile con iPadOS 17+.

1. Installa Xcode e XcodeGen: `brew install xcodegen`.
2. Da `native/ios` esegui `xcodegen generate`. Apri `VertexCrypto.xcodeproj`.
3. Seleziona il target `VertexCrypto` e quello `VertexCryptoWidgetExtension`; in **Signing & Capabilities** assegna il tuo Team. Se necessario, modifica i due `PRODUCT_BUNDLE_IDENTIFIER` nel file `project.yml` prima di generare il progetto.
4. Seleziona il tuo iPad e premi **Run**. È un'app SwiftUI installabile con la sua estensione WidgetKit.
5. Sul dispositivo: tieni premuta la Home → **Aggiungi widget** → **Vertex Crypto** → aggiungi. Tieni premuto il widget → **Modifica widget** → scegli la crypto. Sono previste dimensioni piccola, media e grande.
6. Per build senza firma destinata al simulatore: `bash native/ios/build-debug.sh` da macOS. Il job iPadOS in Actions esegue lo stesso controllo.

WidgetKit decide la cadenza effettiva; il codice richiede un refresh all'incirca ogni **30 minuti**, non in tempo reale continuo.

## Windows 11 — provider nativo in Windows App SDK

È presente `native/windows/VertexCryptoProvider`, un progetto **.NET 8 / Windows App SDK** con:
- `IWidgetProvider` che recupera le quotazioni e aggiorna le **Adaptive Cards**;
- `IClassFactory` e classe COM registrata nell'MSIX;
- `Package.appxmanifest` con **42 definizioni** autonome (Bitcoin, Ethereum, Solana, ORE ecc.);
- aggiornamento richiesto circa ogni **15 minuti** quando il provider resta in esecuzione.

Per installarlo:
1. Apri `VertexCryptoProvider.csproj` in Visual Studio 2022 o successivo su Windows 11 con workload **WinUI / Windows App SDK**; installa .NET 8.
2. Seleziona architettura **x64**. Per produzione configura un certificato MSIX attendibile e sostituisci il `Publisher` dimostrativo nel manifest.
3. Compila e **deploya** l'MSIX da Visual Studio/strumenti Windows App SDK. La sola compilazione del file .csproj non registra il widget.
4. Premi **Win + W** → **Aggiungi widget** → cerca Vertex e scegli la criptovaluta.

Percorso Windows alternativo: installa Vertex dal browser **Microsoft Edge** come PWA (serve HTTPS), apri **Win + W**, trova la sezione Vertex e seleziona la crypto. Questa modalità usa `vertex-widget-sw.js` e i manifest `manifest-vertex-*.webmanifest`.

La disponibilità del provider e della PWA nella galleria Widget dipende dalla versione del sistema e dalla corretta installazione/registrazione. Il packaging per Microsoft Store è un passaggio ulteriore.

## Compilazione automatica, qualità e limiti

La workflow `.github/workflows/native-widget-build.yml` controlla le build:
- Android `gradle ... :app:assembleDebug`, con artifact APK (solo se la build ha successo).
- iPadOS/iOS: build del simulatore senza firma, **non** un IPA distribuibile.
- Windows: compilazione del provider nativo, **non** un MSIX firmato/registrato.

Non è stata ancora eseguita una verifica sui tre sistemi operativi reali in questa sessione: i progetti e i controlli automatici non equivalgono a un widget già installato o pubblicato nello Store.

Dati: `https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json`. Non vengono richiesti account di exchange, credenziali, password o wallet. Le quotazioni (anche di ORE) possono essere ritardate.
