#!/usr/bin/env bash
# Package the game for upload to CrazyGames: dist/pokespinner-crazygames.zip
# The packaged index.html is flagged data-build="crazygames", so the CrazyGames
# SDK (ads, cloud saves, gameplay events) is always on and web-only parts
# (AdSense, external links, install prompt, service worker) are always off.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist/crazygames
rm -rf "$OUT" dist/pokespinner-crazygames.zip
mkdir -p "$OUT"
cp -r index.html css js icons "$OUT"/
sed -i 's/<html lang="en">/<html lang="en" data-build="crazygames">/' "$OUT/index.html"
grep -q 'data-build="crazygames"' "$OUT/index.html" || { echo "could not flag index.html"; exit 1; }
(cd "$OUT" && zip -qr ../pokespinner-crazygames.zip .)
echo "Built dist/pokespinner-crazygames.zip ($(du -h dist/pokespinner-crazygames.zip | cut -f1), $(cd "$OUT" && find . -type f | wc -l) files)"
