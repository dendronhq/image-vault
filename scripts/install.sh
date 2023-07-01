#!/bin/bash

VSIX_FILE=$(find . -maxdepth 1 -type f -name "*.vsix" | head -n 1)

echo "installing $VSIX_FILE..."
code-insiders --install-extension $VSIX_FILE