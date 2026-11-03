#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v xcodegen >/dev/null; then
  echo "Installa XcodeGen con: brew install xcodegen"
  exit 1
fi
xcodegen generate
xcodebuild -project VertexCrypto.xcodeproj -scheme VertexCrypto \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
echo "Build di sviluppo generata. Per installare su iPad scegli il dispositivo in Xcode e configura Signing & Capabilities."
