cd wasm_backend
zig build
cd ../
mv wasm_backend/zig-out/bin/*.wasm server/