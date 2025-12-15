const std = @import("std");

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{});

    // wasm target
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
        .abi = .none,
    });

    const framework_mod = b.addModule("framework", .{
        .root_source_file = b.path("src/framework/framework.zig"),
    });
    const processor_mod = b.addModule("audio_processor", .{
        .root_source_file = b.path("src/processor/AudioProcessor.zig"),
    });

    const wasm = b.addExecutable(.{
        .name = "audio_backend",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/exports.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    processor_mod.addImport("framework", framework_mod);

    wasm.root_module.addImport("framework", framework_mod);
    wasm.root_module.addImport("AudioProcessor", processor_mod);

    // Typical wasm-friendly options (pick what you need)
    wasm.entry = .disabled; // no Zig "main" required
    wasm.rdynamic = true; // export symbols

    b.installArtifact(wasm);
}
