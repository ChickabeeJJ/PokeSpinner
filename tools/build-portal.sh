#!/usr/bin/env bash
# Package this branch's portal build: dist/pokespinner-<portal>.zip
# The portal name comes from js/sdk-adapter.js (Portal.use({ name: '…' })).
# The packaged index.html is flagged data-build="<portal>", so the portal SDK is
# always on and web-only parts (external links, install prompt, service worker)
# are always off.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$(grep -oE "name: *'[a-z]+'" js/sdk-adapter.js | head -1 | sed -E "s/name: *'([a-z]+)'/\1/")
[ -n "$NAME" ] || { echo "js/sdk-adapter.js registers no portal (are you on a portal branch?)"; exit 1; }
OUT="dist/$NAME"
rm -rf "$OUT" "dist/pokespinner-$NAME.zip"
mkdir -p "$OUT"
cp -r index.html css js icons "$OUT"/
sed -i "s/<html lang=\"en\">/<html lang=\"en\" data-build=\"$NAME\">/" "$OUT/index.html"
grep -q "data-build=\"$NAME\"" "$OUT/index.html" || { echo "could not flag index.html"; exit 1; }
(cd "$OUT" && zip -qr "../pokespinner-$NAME.zip" .)
echo "Built dist/pokespinner-$NAME.zip ($(du -h "dist/pokespinner-$NAME.zip" | cut -f1), $(cd "$OUT" && find . -type f | wc -l) files)"
