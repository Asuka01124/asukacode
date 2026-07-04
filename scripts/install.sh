#!/usr/bin/env bash
# AsukaCode Linux Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.sh | bash

set -e
REPO="Asuka01124/asukacode"
VERSION="latest"
INSTALL_DIR="$HOME/.local/bin"

case "$(uname -s)" in
  Linux)  BINARY="asukacode-linux-x64" ;;
  *)      echo "Unsupported platform: $(uname -s)"; exit 1 ;;
esac

mkdir -p "$INSTALL_DIR"

if [ "$VERSION" = "latest" ]; then
  URL="https://github.com/$REPO/releases/latest/download/$BINARY"
else
  URL="https://github.com/$REPO/releases/download/$VERSION/$BINARY"
fi

echo "Downloading $URL ..."
curl -fsSL "$URL" -o "$INSTALL_DIR/asukacode"
chmod +x "$INSTALL_DIR/asukacode"

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "Add to your ~/.bashrc or ~/.zshrc:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

echo "AsukaCode installed! Run: asukacode"
