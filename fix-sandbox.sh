#!/bin/bash
echo "Setting correct permissions for chrome-sandbox..."
sudo chown root:root dist-electron/linux-unpacked/chrome-sandbox
sudo chmod 4755 dist-electron/linux-unpacked/chrome-sandbox
echo "Permissions set. You can now run the app without --no-sandbox."
