// Copyright (c) 2025, Algorealm Inc.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use scale_value::{Value, ValueDef, Composite, Primitive};
use serde_json::{json, Value as JsonValue};

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

// Extract bytes from nested structure (handles arrays wrapping byte arrays)
pub fn extract_bytes_from_nested(value: &Value<u32>) -> Option<Vec<u8>> {
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(fields)) => {
            // If it's a single-element array, unwrap it
            if fields.len() == 1 {
                return extract_bytes_from_nested(&fields[0]);
            }
            
            // Check if this is a byte array
            if is_byte_array(fields) {
                let bytes: Vec<u8> = fields.iter().filter_map(|v| {
                    if let ValueDef::Primitive(Primitive::U128(n)) = &v.value {
                        if *n <= 255 {
                            return Some(*n as u8);
                        }
                    }
                    None
                }).collect();
                
                if bytes.len() == fields.len() {
                    return Some(bytes);
                }
            }
            None
        }
        _ => None,
    }
}


fn is_byte_array(fields: &[Value<u32>]) -> bool {
    !fields.is_empty() && fields.iter().all(|v| {
        matches!(&v.value, ValueDef::Primitive(Primitive::U128(n)) if *n <= 255)
    })
}