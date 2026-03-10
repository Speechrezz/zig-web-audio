#!/usr/bin/env bash
set -euo pipefail

echo "Clean"
mkdir -p out
rm -rf out/*

echo "Bundle JavaScript"
bun build ./site/index.html --outdir ./out --minify
bun build ./site/src/audio/wasm-worklet.js --outdir ./out --minify

cp ./site/server.js ./out/

echo "Compile WASM backend"
(
  cd ./wasm_backend
  zig build test
  zig build -Doptimize=ReleaseSmall
)

cp ./wasm_backend/zig-out/bin/*.wasm ./out/