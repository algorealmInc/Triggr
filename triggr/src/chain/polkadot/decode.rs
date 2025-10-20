// Copyright (c) 2025, Algorealm Inc.

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ContractMetadata {
    spec: ContractSpec,
    types: Vec<TypeDef>,
}

#[derive(Debug, Clone, Deserialize)]
struct ContractSpec {
    events: Vec<EventSpec>,
}

#[derive(Debug, Clone, Deserialize)]
struct EventSpec {
    label: String,
    signature_topic: String,
    args: Vec<EventArg>,
}

#[derive(Debug, Clone, Deserialize)]
struct EventArg {
    label: String,
    indexed: bool,
    #[serde(rename = "type")]
    type_info: TypeInfo,
}

#[derive(Debug, Clone, Deserialize)]
struct TypeInfo {
    #[serde(rename = "type")]
    type_id: u32,
    #[serde(rename = "displayName")]
    display_name: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct TypeDef {
    id: u32,
    #[serde(rename = "type")]
    type_def: TypeDefDetails,
}

#[derive(Debug, Clone, Deserialize)]
struct TypeDefDetails {
    path: Option<Vec<String>>,
    def: serde_json::Value,
}