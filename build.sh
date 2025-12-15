zig build-exe src/audio.zig -target wasm32-freestanding -rdynamic -fno-entry
mv audio.wasm server/