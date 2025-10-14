// Copyright (c) 2025, Algorealm Inc.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Full contract metadata structure
#[derive(Debug, Deserialize)]
struct ContractMetadata {
    spec: Spec,
}

#[derive(Debug, Deserialize)]
struct Spec {
    events: Vec<Event>,
}

#[derive(Debug, Deserialize)]
struct Event {
    label: String,
    #[serde(default)]
    args: Vec<EventArg>,
}

#[derive(Debug, Deserialize)]
struct EventArg {
    label: String,
}

/// Simplified output structure
#[derive(Debug, Serialize, ToSchema)]
pub struct SimplifiedEvent {
    label: String,
    args: Vec<String>,
}

/// Parse contract metadata and extract events with their arguments
/// 
/// # Arguments
/// * `json_str` - JSON string containing the full contract metadata
/// 
/// # Returns
/// Vector of simplified events with just label and arg names
/// 
/// # Example
/// ```
/// let metadata = fs::read_to_string("token.json")?;
/// let events = parse_contract_events(&metadata)?;
/// // Returns: [{ label: "Transfer", args: ["from", "to", "value"] }, ...]
/// ```
pub fn parse_contract_events(json_str: &str) -> Result<Vec<SimplifiedEvent>, serde_json::Error> {
    let metadata: ContractMetadata = serde_json::from_str(json_str)?;
    
    let simplified_events = metadata
        .spec
        .events
        .into_iter()
        .map(|event| SimplifiedEvent {
            label: event.label,
            args: event.args.into_iter().map(|arg| arg.label).collect(),
        })
        .collect();
    
    Ok(simplified_events)
}