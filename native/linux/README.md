# Vertex Crypto nativa per Linux (GTK 4)

App desktop con GTK 4, ricerca crypto, prezzi e variazioni e aggiornamento ogni minuto quando la finestra è aperta. I dati vengono letti dal feed pubblico `market-quotes.json`; possono essere ritardati.

Su Ubuntu/Debian:

```bash
sudo apt install python3 python3-gi gir1.2-gtk-4.0
bash native/linux/install.sh
```

L'app si trova nel menu applicazioni oppure da terminale con `~/.local/bin/vertex-crypto`.

Su Linux la disponibilità dei widget sulla scrivania dipende dal desktop environment (GNOME/KDE ecc.), perché non esiste una galleria Widget uniforme equivalente a Android/iPadOS/Windows. Questa è un'app GTK nativa, non un provider di widget della scrivania. Non vengono inventati prezzi in caso di errore del feed.
