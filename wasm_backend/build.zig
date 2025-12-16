const std = @import("std");

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{});

    // --- WASM target ---

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

    // --- Native tests target (not WASM) ---

    const native_target = b.standardTargetOptions(.{});

    // Test the framework module (runs all `test {}` blocks reachable from framework.zig)
    const framework_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/framework/framework.zig"),
            .target = native_target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "framework", .module = framework_mod },
                .{ .name = "AudioProcessor", .module = processor_mod }, // only if framework tests import it
            },
        }),
    });
    const run_framework_tests = b.addRunArtifact(framework_tests);

    // Test the processor module
    const processor_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/processor/AudioProcessor.zig"),
            .target = native_target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "framework", .module = framework_mod },
            },
        }),
    });
    const run_processor_tests = b.addRunArtifact(processor_tests);

    // Top-level `zig build test`
    const test_step = b.step("test", "Run native tests");
    test_step.dependOn(&run_framework_tests.step);
    test_step.dependOn(&run_processor_tests.step);
}
