#!/usr/bin/env bash
# Run this from the same folder as index.html on your own machine.
# The Figma asset links are temporary (~7 days), so run it soon.
set -e
mkdir -p assets && cd assets
curl -fL -o btc.png        "https://www.figma.com/api/mcp/asset/e9e3ff04-4ef0-478a-9079-73f032ea122c.png"
curl -fL -o latest.png     "https://www.figma.com/api/mcp/asset/5dadb62f-d378-4123-961b-1bdbd9f1b1f5.png"
curl -fL -o arrow.svg      "https://www.figma.com/api/mcp/asset/4e268bcb-2d4c-448a-b82b-37133a1e7401.svg"
echo "Done. Assets saved to ./assets"
