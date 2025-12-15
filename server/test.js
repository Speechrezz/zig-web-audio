const fs = require('fs');
const source = fs.readFileSync("./audio_backend.wasm");
const typedArray = new Uint8Array(source);

let instance;

function decodeUtf8(mem) {
  let s = "";
  for (let i = 0; i < mem.length; i++) {
    s += String.fromCharCode(mem[i]);
  }
  return s;
}

WebAssembly.instantiate(typedArray, {
  env: {
    consoleLogImpl: (ptr, len) => {
      const mem = new Uint8Array(instance.exports.memory.buffer, ptr, len);
      console.log(decodeUtf8(mem));
    }
  }
}).then(result => {
  instance = result.instance;
  const add = instance.exports.add;
  add(1, 2);
});