// Copyright (c) 2025, Algorealm Inc.

mod prelude;
mod server;
mod storage;
mod chain;
mod util;

// Re-export prelude definitions
pub(crate) use prelude::*;

pub use server::startup::run as start;