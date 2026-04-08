const std = @import("std");
const audio = @import("../audio/audio.zig");
const logging = @import("../web/logging.zig");
const TestingAudioProcessor = @import("TestingAudioProcessor.zig");

pub const Error = audio.ProcessorRegistry.Error;

fn keyValueFromProcessor(comptime Processor: type) struct { []const u8, @TypeOf(Processor.create) } {
    return .{ Processor.kind, Processor.create };
}

const create_fn_type = @TypeOf(&TestingAudioProcessor.create);
const kindProcessorMap: std.StaticStringMap(create_fn_type) = .initComptime(
    .{
        keyValueFromProcessor(TestingAudioProcessor),
    },
);

/// Create and populate VTable for `framework.audio.ProcessorRegistry`.
pub fn createInstance() audio.ProcessorRegistry {
    return .{
        .ptr = undefined,
        .vtable = &.{
            .createProcessorFromKind = createProcessorFromKindVTable,
        },
    };
}

pub fn createProcessorFromKind(allocator: std.mem.Allocator, kind: []const u8) !*audio.AudioProcessor {
    const create_fn = kindProcessorMap.get(kind) orelse return Error.ProcessorKindDoesNotExist;
    return create_fn(allocator);
}

fn createProcessorFromKindVTable(_: *anyopaque, allocator: std.mem.Allocator, kind: []const u8) !*audio.AudioProcessor {
    return createProcessorFromKind(allocator, kind);
}
