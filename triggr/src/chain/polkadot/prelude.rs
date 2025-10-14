// Copyright (c) 2025, Algorealm Inc.

use std::collections::HashMap;
use serde_json::Value;

/// (Ws) url of ontracts chain to connect to
pub const CONTRACTS_NODE_URL: &str = "wss://testnet-passet-hub.polkadot.io";

/// Runtime event data
#[derive(Debug, Clone)]
pub struct EventData {
    pub event_name: String,
    pub fields: HashMap<String, Value>,
}