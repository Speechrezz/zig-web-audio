#!/usr/bin/env bash
set -euo pipefail

echo "Clean"
mkdir -p out
rm -rf out/*

echo "Bundle JavaScript"
bun build ./site/src/main.js --outdir ./out/src --minify
bun build ./site/src/audio/wasm-worklet.js --outdir ./out/src --minify

cp ./site/index.html ./out/
cp ./site/server.js ./out/
cp ./site/server.go ./out/

echo "Compile WASM backend"
(
  cd ./wasm_backend
  zig build test
  zig build -Doptimize=ReleaseSmall
)

cp ./wasm_backend/zig-out/bin/*.wasm ./out/src