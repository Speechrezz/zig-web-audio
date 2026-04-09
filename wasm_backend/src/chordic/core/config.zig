const Version = @import("Version.zig");

pub const version: Version = .init(0, 1, 0, 0);
pub const version_str = version.comptimeString();
