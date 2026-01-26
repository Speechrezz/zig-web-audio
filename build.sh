cd wasm_backend
zig build test
zig build #-Doptimize=ReleaseSmall
cd ../
mv wasm_backend/zig-out/bin/*.wasm site/audio/