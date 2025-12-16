const std = @import("std");
const builtin = @import("builtin");

pub const is_wasm =
    builtin.target.cpu.arch == .wasm32 and
    (builtin.target.os.tag == .freestanding or builtin.target.os.tag == .wasi);
