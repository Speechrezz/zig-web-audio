cd wasm_backend
zig build test
zig build #-Doptimize=ReleaseSmall
cd ../
cp wasm_backend/zig-out/bin/audio.wasm site/src/audio/
cp wasm_backend/zig-out/bin/main.wasm site/src/app/