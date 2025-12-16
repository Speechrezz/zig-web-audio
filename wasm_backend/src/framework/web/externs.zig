const std = @import("std");

pub extern "env" fn consoleLogBinding(ptr: [*]const u8, len: usize) void;

pub extern "env" fn getCurrentFrame() i64;
