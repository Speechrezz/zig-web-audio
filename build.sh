cd wasm_backend
zig build test
zig build
cd ../
mv wasm_backend/zig-out/bin/*.wasm site/