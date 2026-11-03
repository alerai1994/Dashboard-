#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$APP_DIR/../.." && pwd)"
BIN_DIR="${HOME}/.local/bin"
APPS_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/192x192/apps"
mkdir -p "$BIN_DIR" "$APPS_DIR" "$ICON_DIR"
install -m 755 "$APP_DIR/vertex_crypto.py" "$BIN_DIR/vertex-crypto"
install -m 644 "$APP_DIR/vertex-crypto.desktop" "$APPS_DIR/vertex-crypto.desktop"
install -m 644 "$ROOT/icons/vertex-original-192.png" "$ICON_DIR/vertex-crypto.png"
echo "Vertex Crypto installato per l'utente corrente."
echo "Dipendenze richieste: python3, python3-gi, gir1.2-gtk-4.0"
echo "Avvia dal menu applicazioni, oppure digita: $BIN_DIR/vertex-crypto"
