// Copyright (c) 2025, Algorealm Inc.

// This module handles all blockchain operations and interfacing.

pub mod polkadot;

use self::polkadot::Polkadot;

/// Interface to manage all supported chain.
#[derive(Default, Debug)]
pub struct Blockchain {
    /// Polkadot chain
    pub polkadot: Polkadot,
}
