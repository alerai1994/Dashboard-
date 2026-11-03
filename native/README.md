# Vertex Crypto — widget nativi per Android, iPhone/iPad e Windows 11

Questo repository contiene:
- **Android**: app Android con `AppWidgetProvider`, schermata di configurazione per 42 crypto, refresh e più widget indipendenti.
- **iOS/iPadOS**: app SwiftUI e target WidgetKit/App Intents che consente di modificare la crypto di ciascun widget.
- **Windows 11**: provider **nativo** Windows App SDK (.NET 8 / C# con registrazione COM tramite pacchetto MSIX) e, in alternativa, integrazione nella bacheca Widget dell'app PWA installata da Edge.
- **Dashboard web**: non contiene più la sezione Widget Crypto. I widget sono gestiti e selezionati soltanto dal sistema operativo, dopo l'installazione dell'app nativa (Android/iPadOS) o del provider/PWA per Windows.

I tre sistemi leggono `market-quotes.json` verificato dal repository. Quando il feed non è aggiornato o irraggiungibile **non vengono inventati prezzi**. Il timestamp della fonte può essere precedente al momento del refresh.

## App native indipendenti dalla dashboard web

Vertex Crypto dispone di progetti di applicazione nativa distinti, sviluppati con le API del sistema:

- **Android (Kotlin)** — `native/android`: app con elenco crypto ricercabile, prezzi e variazioni, dettagli dei mercati, aggiornamento del feed, comando per richiedere al launcher un widget Home, e provider `AppWidgetProvider` configurabile.
- **iPhone e iPad (SwiftUI)** — `native/ios`: app con ricerca, preferiti, schede dei mercati, aggiornamento delle quotazioni e WidgetKit (widget piccoli, medi e grandi con crypto configurabile).
- **macOS (SwiftUI)** — stesso progetto Xcode, target `VertexCryptoMac` e `VertexCryptoMacWidget`. L'utente può aggiungere i widget al desktop o al Centro Notifiche secondo le funzioni del sistema.
- **Windows 11 (C# WinForms)** — `native/windows/VertexCryptoProvider`: app desktop con ricerca e prezzi, più provider `IWidgetProvider` per i widget nella bacheca **Win + W**. La registrazione del provider richiede il packaging MSIX sotto `native/windows/VertexCryptoPackage`.
- **Linux (Python + GTK 4)** — `native/linux`: app desktop nativa GTK, con launcher nel menu applicazioni. Su Linux non esiste un'interfaccia standard di widget valida per tutte le distribuzioni; gli eventuali widget sulla scrivania richiedono un'integrazione specifica con GNOME, KDE Plasma o un altro desktop environment.

I progetti non richiedono un account exchange né credenziali di portafoglio. Il feed pubblico resta soggetto ai tempi di aggiornamento della fonte. **Non sono equivalenti a pacchetti già firmati o pubblicati negli store.**

## Come aggiungere i widget sulla schermata Home

Su **Android** e **iPhone/iPad** i widget compaiono nella schermata Home del dispositivo dopo l'installazione dell'app e l'aggiunta dalla galleria Widget. Su **Windows 11**, i widget nativi compaiono nella **bacheca Widget** (Win + W), non direttamente sul desktop come normali icone.

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

## Installazione su macOS e Linux

**macOS**: sul Mac installa Xcode e XcodeGen; genera il progetto con `cd native/ios && xcodegen generate` e apri `VertexCrypto.xcodeproj`. Compila il target `VertexCryptoMac` e configura la firma per distribuire l'app. In macOS 14+ aggiungi il widget Vertex dal menu Widget del desktop o dal Centro Notifiche, dopo aver installato l'app firmata.

**Linux**: installa `python3-gi` e GTK 4, quindi esegui `bash native/linux/install.sh`. Apri *Vertex Crypto* dal menu applicazioni. L'integrazione come widget della scrivania non è universale su Linux ed è un lavoro distinto.

## Come ottenere gli artefatti da GitHub Actions

Apri **Actions → Build Vertex native apps and widgets** e avvia il workflow. Se i job completano con successo, gli artefatti sono:
- `vertex-crypto-android-debug-apk` (APK Android di sviluppo installabile);
- `vertex-crypto-ios-ipados-simulator` (app Apple **solo per il simulatore**, non installabile su iPhone/iPad fisici senza firma);
- `vertex-crypto-macos-unsigned-app` (app macOS per sviluppo, da firmare/distribuire);
- `vertex-crypto-windows-developer-files` (file eseguibili di sviluppo Windows);
- `vertex-crypto-windows-msix-unsigned` (MSIX da **firmare con certificato attendibile prima di installare**).

Le compilazioni non sono state confermate in questa sessione. Per la pubblicazione su Google Play, App Store e Microsoft Store sono necessari account sviluppatore, certificati di firma, test su dispositivi reali e procedure dei rispettivi store.
