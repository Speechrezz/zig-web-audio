#  ---Clean---
echo "Clean"

rm -rf out/*

#  ---Bundle JavaScript---
echo "Bundle JavaScript"

bun build ./site/index.html --outdir ./out --minify
bun build ./site/src/audio/wasm-worklet.js --outdir ./out --minify

cp site/server.js out/

#  ---Compile WASM backend---
echo "Compile WASM backend"

cd wasm_backend
zig build test
zig build -Doptimize=ReleaseSmall
cd ../
mv wasm_backend/zig-out/bin/*.wasm out/