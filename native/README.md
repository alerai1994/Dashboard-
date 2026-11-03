# Vertex Crypto — widget dei dispositivi

Questa cartella contiene **codice sorgente nativo**, non un'app già firmata o installata.
I widget compaiono nel selettore del sistema **solo dopo** aver compilato, firmato e
installato l'app corrispondente. Non basta aprire Vertex dal browser.

## Android (telefono / tablet)
1. Apri `native/android` in Android Studio e sincronizza Gradle (JDK 17).
2. Compila e installa il progetto `app` sul telefono.
3. Tieni premuto sulla schermata Home → **Widget** → **Vertex Crypto**.
4. Posiziona il widget e scegli la crypto dall'elenco (42 strumenti, compreso ORE).
5. Per scegliere crypto differenti, aggiungi più istanze del widget.

Il widget usa `market-quotes.json` pubblico del repository GitHub, perciò prezzi e
variazioni possono essere ritardati. L'aggiornamento periodico Android è
impostato a **30 minuti**; Android può ritardarlo per risparmiare batteria.
Serve una connessione internet. Se non sono presenti quotazioni verificabili,
il widget mostra “—”, non numeri fittizi.

## iPhone e iPad (iOS / iPadOS)
1. In Xcode crea un'app iOS con un target **Widget Extension** basato su App Intents.
2. Aggiungi `native/ios/VertexCryptoWidget.swift` al target dell'estensione
   (sostituisci il codice WidgetKit generato dal template).
3. Imposta la versione minima iOS compatibile con `AppIntentConfiguration`
   (iOS/iPadOS 17 o successivi), poi firma e installa l'app sull'iPhone o iPad.
4. Tieni premuto sulla schermata Home → **Aggiungi widget** → **Vertex Crypto**.
5. Tocca e tieni premuto il widget → **Modifica widget** → scegli una crypto.
   Puoi aggiungere più widget con criptovalute diverse.

WidgetKit decide l'effettivo momento degli aggiornamenti; il codice propone
un refresh ogni **30 minuti**, senza garantire prezzi live secondo per secondo.

## Windows 11
La PWA Vertex include definizioni separate per le **42 criptovalute** nei manifest
`manifest-vertex-*.webmanifest`. Il service worker `vertex-widget-sw.js`
aggiorna le schede Adaptive Card a partire da `market-quotes.json`.
1. Pubblica Vertex su un'origine HTTPS raggiungibile e installalo con Edge come PWA.
2. Apri **Win + W** → aggiungi widget → cerca **Vertex** e scegli la crypto.
3. Le definizioni sono disponibili per tutti e quattro i temi/icona dell'app.
4. Il supporto dipende dalla versione di Windows/Edge e dalla distribuzione della
   PWA. La pubblicazione nel Microsoft Store potrebbe richiedere packaging e
   controlli ulteriori. Anche i refresh in background dipendono dal sistema.

Nota: la pagina “Widget Crypto” del sito salva le scelte nel browser. I widget
nativi mantengono le proprie scelte, perché browser e sistema operativo non
condividono automaticamente le preferenze.

## Privacy e dati
I widget leggono solo dati pubblici di mercato, senza chiavi API e senza accesso
a conti o portafogli dell'utente. Le fonti possono essere ritardate o offline.
Il timestamp visualizzato è quello della fonte; una richiesta recente non
significa necessariamente un prezzo recente.

## Limiti e test
Questi sorgenti sono un punto di partenza tecnico: occorre completare la
procedura di build, installazione, firma e test su dispositivi reali.
Non sono stati ancora generati APK/IPA né verificata la registrazione nella
galleria widget di Android, iOS/iPadOS o nella bacheca Windows 11.
