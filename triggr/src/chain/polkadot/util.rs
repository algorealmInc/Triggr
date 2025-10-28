// Copyright (c) 2025, Algorealm Inc.

use std::collections::HashMap;

use parity_scale_codec::Decode;
use scale_value::{Composite, Primitive, Value, ValueDef};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use tokio::sync::mpsc::Sender;
use tracing::info;
use utoipa::ToSchema;

use crate::chain::polkadot::prelude::EventData;

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
/// Simplified output structure
#[derive(Debug, Serialize, ToSchema)]
pub struct SimplifiedEvent {
    label: String,
    args: Vec<String>,
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
                let bytes: Vec<u8> = fields
                    .iter()
                    .filter_map(|v| {
                        if let ValueDef::Primitive(Primitive::U128(n)) = &v.value {
                            if *n <= 255 {
                                return Some(*n as u8);
                            }
                        }
                        None
                    })
                    .collect();

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
    !fields.is_empty()
        && fields
            .iter()
            .all(|v| matches!(&v.value, ValueDef::Primitive(Primitive::U128(n)) if *n <= 255))
}

/// Main function to convert ContractMetadata to SimplifiedEvents
pub fn simplify_events(metadata: &ContractMetadata) -> Vec<SimplifiedEvent> {
    // Build a type lookup map
    let type_map = build_type_map(&metadata.types);

    // Process each event
    metadata
        .spec
        .events
        .iter()
        .map(|event| SimplifiedEvent {
            label: event.label.clone(),
            args: event
                .args
                .iter()
                .map(|arg| format_event_arg(arg, &type_map))
                .collect(),
        })
        .collect()
}

/// Build a map of type_id to resolved type name
fn build_type_map(types: &[TypeDef]) -> HashMap<u32, String> {
    let mut map = HashMap::new();

    for type_def in types {
        let type_name = resolve_type_name(&type_def.type_def);
        map.insert(type_def.id, type_name);
    }

    map
}

/// Resolve a type name from TypeDefDetails
fn resolve_type_name(details: &TypeDefDetails) -> String {
    // Check if it's a primitive type
    if let Some(primitive) = details.def.get("primitive") {
        if let Some(prim_str) = primitive.as_str() {
            return prim_str.to_string();
        }
    }

    // Check if it has a path (named type)
    if let Some(path) = &details.path {
        if !path.is_empty() {
            // Use the last element of the path as the type name
            return path.last().unwrap().clone();
        }
    }

    // Check for composite types
    if details.def.get("composite").is_some() {
        if let Some(path) = &details.path {
            if !path.is_empty() {
                return path.last().unwrap().clone();
            }
        }
        return "composite".to_string();
    }

    // Check for variant types (like Result, Option)
    if details.def.get("variant").is_some() {
        if let Some(path) = &details.path {
            if !path.is_empty() {
                return path.last().unwrap().clone();
            }
        }
        return "variant".to_string();
    }

    // Check for array types
    if let Some(array_def) = details.def.get("array") {
        if let Some(len) = array_def.get("len") {
            return format!("array[{}]", len);
        }
        return "array".to_string();
    }

    // Check for tuple types
    if details.def.get("tuple").is_some() {
        return "tuple".to_string();
    }

    // Default fallback
    "unknown".to_string()
}

/// Format an event argument with its type
fn format_event_arg(arg: &EventArg, type_map: &HashMap<u32, String>) -> String {
    // Get the type name from display_name or type_map
    let type_name = if !arg.type_info.display_name.is_empty() {
        arg.type_info.display_name.join("::")
    } else if let Some(resolved_type) = type_map.get(&arg.type_info.type_id) {
        resolved_type.clone()
    } else {
        format!("type_{}", arg.type_info.type_id)
    };

    // Format as "name: type" with indexed indicator if applicable
    if arg.indexed {
        format!("{}: {} (indexed)", arg.label, type_name)
    } else {
        format!("{}: {}", arg.label, type_name)
    }
}

/// Convenience function to deserialize and simplify from JSON string
pub fn simplify_events_from_json(
    json_str: &str,
) -> Result<Vec<SimplifiedEvent>, serde_json::Error> {
    let metadata: ContractMetadata = serde_json::from_str(json_str)?;
    Ok(simplify_events(&metadata))
}

/// Convenience function to get simplified events as JSON string
pub fn simplify_events_to_json(metadata: &ContractMetadata) -> Result<String, serde_json::Error> {
    let simplified = simplify_events(metadata);
    serde_json::to_string_pretty(&simplified)
}

pub fn value_to_json(value: &Value<u32>) -> JsonValue {
    match &value.value {
        ValueDef::Composite(composite) => composite_to_json(composite),
        ValueDef::Variant(variant) => {
            json!({
                "variant": &variant.name,
                "values": composite_to_json(&variant.values)
            })
        }
        ValueDef::Primitive(primitive) => primitive_to_json(primitive),
        ValueDef::BitSequence(bits) => {
            json!({
                "type": "BitSequence",
                "bits": format!("{:?}", bits)
            })
        }
    }
}

pub fn composite_to_json(composite: &Composite<u32>) -> JsonValue {
    match composite {
        Composite::Named(fields) => {
            let mut obj = serde_json::Map::new();
            for (name, value) in fields.iter() {
                obj.insert(name.to_string(), value_to_json(value));
            }
            JsonValue::Object(obj)
        }
        Composite::Unnamed(fields) => {
            // Check if this is a byte array that should be converted to hex
            if is_byte_array(fields) {
                let bytes: Vec<u8> = fields
                    .iter()
                    .filter_map(|v| {
                        if let ValueDef::Primitive(Primitive::U128(n)) = &v.value {
                            if *n <= 255 {
                                return Some(*n as u8);
                            }
                        }
                        None
                    })
                    .collect();

                if bytes.len() == fields.len() {
                    // Check if it looks like an AccountId (32 bytes) or other common types
                    if bytes.len() == 32 {
                        // Try to decode as string first (for pallet names, etc.)
                        if let Ok(s) = std::str::from_utf8(&bytes) {
                            if s.chars().all(|c| {
                                c.is_ascii_alphanumeric() || c == '\0' || c.is_ascii_whitespace()
                            }) {
                                let trimmed = s.trim_end_matches('\0');
                                if !trimmed.is_empty() {
                                    return json!({
                                        "type": "String",
                                        "value": trimmed
                                    });
                                }
                            }
                        }
                        // Otherwise it's likely an AccountId
                        return json!({
                            "type": "AccountId32",
                            "value": format!("0x{}", hex::encode(&bytes))
                        });
                    } else {
                        // Generic byte array
                        return json!({
                            "type": "Bytes",
                            "value": format!("0x{}", hex::encode(&bytes))
                        });
                    }
                }
            }

            // Recursively decode the array
            JsonValue::Array(fields.iter().map(|v| value_to_json(v)).collect())
        }
    }
}

pub fn primitive_to_json(primitive: &Primitive) -> JsonValue {
    match primitive {
        Primitive::Bool(b) => json!(b),
        Primitive::Char(c) => json!(c.to_string()),
        Primitive::String(s) => json!(s),
        Primitive::U128(n) => json!(n.to_string()),
        Primitive::U256(n) => json!(format!("0x{}", hex::encode(n))),
        Primitive::I128(n) => json!(n.to_string()),
        Primitive::I256(n) => json!(format!("0x{}", hex::encode(n))),
    }
}

// Decode contract event bytes using contract metadata
pub async fn decode_contract_event_with_metadata(
    tx: Sender<(String, EventData)>,
    contract_addr: String,
    bytes: &[u8],
    metadata: &ContractMetadata,
) {
    if bytes.is_empty() {
        info!("      Empty event data");
        return;
    }

    let mut cursor = &bytes[..];

    // First byte is the event selector
    let selector = match u8::decode(&mut cursor) {
        Ok(s) => s,
        Err(e) => {
            info!("      ❌ Failed to decode selector: {:?}", e);
            return;
        }
    };

    info!("      Selector: 0x{:02x}", selector);

    // Try to find matching event by trying to decode with each event spec
    for event_spec in &metadata.spec.events {
        info!("      Trying event: {}", event_spec.label);

        let mut decode_cursor = cursor;
        let mut decoded_fields = HashMap::new();
        let mut success = true;

        // In this implementation, ALL fields (indexed and non-indexed) are in the data
        // This differs from standard Substrate events where indexed fields are in topics
        for arg in &event_spec.args {
            let field_result =
                decode_field_by_type(&mut decode_cursor, arg.type_info.type_id, metadata);

            match field_result {
                Ok(value) => {
                    decoded_fields.insert(arg.label.clone(), value);
                }
                Err(e) => {
                    info!("        ❌ Failed to decode field '{}': {:?}", arg.label, e);
                    success = false;
                    break;
                }
            }
        }

        // Gather event args
        let mut event_args: HashMap<String, JsonValue> = HashMap::new();

        if success && decode_cursor.is_empty() {
            info!(
                "      ✅ Successfully decoded as event: {}",
                event_spec.label
            );
            for arg in &event_spec.args {
                if let Some(value) = decoded_fields.get(&arg.label) {
                    let indexed_marker = if arg.indexed { " (indexed)" } else { "" };
                    info!("        {}{}: {}", arg.label, indexed_marker, value);

                    event_args.insert(arg.label.clone(), parse_event_string(value));
                }
            }

            // Push into queue for the database to execute it's trigger rules
            let event_data = EventData {
                event_name: event_spec.label.clone(),
                fields: event_args,
            };

            // Push into stream
            let _ = tx.send((contract_addr, event_data)).await;

            return;
        } else if !success {
            // Reset and try next event
            continue;
        } else if !decode_cursor.is_empty() {
            info!(
                "        ⚠️ Extra bytes remaining after decode: {} bytes",
                decode_cursor.len()
            );
        }
    }

    info!("      ⚠️ Could not match event to metadata");
    info!("      Raw data analysis:");

    // Try to manually decode to help debug
    let mut manual_cursor = cursor;
    info!("        Attempting manual decode:");

    // Try H160 (20 bytes)
    if manual_cursor.len() >= 20 {
        if let Ok(addr_bytes) = <[u8; 20]>::decode(&mut manual_cursor) {
            info!("        Possible H160: 0x{}", hex::encode(addr_bytes));
        }
    }

    // Try u128
    if manual_cursor.len() >= 16 {
        if let Ok(val) = u128::decode(&mut manual_cursor) {
            info!("        Possible u128: {}", val);
        }
    }

    // Try String
    if let Ok(s) = String::decode(&mut manual_cursor) {
        info!("        Possible String: {:?}", s);
    }

    info!("      Remaining bytes: 0x{}", hex::encode(cursor));
}

fn decode_field_by_type(
    cursor: &mut &[u8],
    type_id: u32,
    metadata: &ContractMetadata,
) -> Result<String, String> {
    // Find the type definition
    let type_def = metadata
        .types
        .iter()
        .find(|t| t.id == type_id)
        .ok_or_else(|| format!("Type {} not found", type_id))?;

    // Handle primitive types
    if let Some(def) = type_def.type_def.def.get("primitive") {
        if let Some(prim_type) = def.as_str() {
            return match prim_type {
                "u128" => {
                    let val = u128::decode(cursor)
                        .map_err(|e| format!("Failed to decode u128: {:?}", e))?;
                    Ok(val.to_string())
                }
                "u64" => {
                    let val = u64::decode(cursor)
                        .map_err(|e| format!("Failed to decode u64: {:?}", e))?;
                    Ok(val.to_string())
                }
                "u32" => {
                    let val = u32::decode(cursor)
                        .map_err(|e| format!("Failed to decode u32: {:?}", e))?;
                    Ok(val.to_string())
                }
                "u16" => {
                    let val = u16::decode(cursor)
                        .map_err(|e| format!("Failed to decode u16: {:?}", e))?;
                    Ok(val.to_string())
                }
                "u8" => {
                    let val =
                        u8::decode(cursor).map_err(|e| format!("Failed to decode u8: {:?}", e))?;
                    Ok(val.to_string())
                }
                "i128" => {
                    let val = i128::decode(cursor)
                        .map_err(|e| format!("Failed to decode i128: {:?}", e))?;
                    Ok(val.to_string())
                }
                "i64" => {
                    let val = i64::decode(cursor)
                        .map_err(|e| format!("Failed to decode i64: {:?}", e))?;
                    Ok(val.to_string())
                }
                "i32" => {
                    let val = i32::decode(cursor)
                        .map_err(|e| format!("Failed to decode i32: {:?}", e))?;
                    Ok(val.to_string())
                }
                "i16" => {
                    let val = i16::decode(cursor)
                        .map_err(|e| format!("Failed to decode i16: {:?}", e))?;
                    Ok(val.to_string())
                }
                "i8" => {
                    let val =
                        i8::decode(cursor).map_err(|e| format!("Failed to decode i8: {:?}", e))?;
                    Ok(val.to_string())
                }
                "str" => {
                    let val = String::decode(cursor)
                        .map_err(|e| format!("Failed to decode string: {:?}", e))?;
                    Ok(format!("{:?}", val))
                }
                "bool" => {
                    let val = bool::decode(cursor)
                        .map_err(|e| format!("Failed to decode bool: {:?}", e))?;
                    Ok(val.to_string())
                }
                _ => Err(format!("Unknown primitive type: {}", prim_type)),
            };
        }
    }

    // Handle arrays
    if let Some(def) = type_def.type_def.def.get("array") {
        if let (Some(len), Some(inner_type)) = (def.get("len"), def.get("type")) {
            let array_len = len.as_u64().ok_or("Invalid array length")? as usize;
            let inner_type_id = inner_type.as_u64().ok_or("Invalid inner type")? as u32;

            // Special case for byte arrays (common for addresses/hashes)
            if inner_type_id == 10 {
                // u8 type
                let mut bytes = vec![0u8; array_len];
                for i in 0..array_len {
                    bytes[i] = u8::decode(cursor)
                        .map_err(|e| format!("Failed to decode byte array: {:?}", e))?;
                }
                return Ok(format!("0x{}", hex::encode(bytes)));
            }

            // Generic array decoding
            let mut values = Vec::new();
            for _ in 0..array_len {
                let val = decode_field_by_type(cursor, inner_type_id, metadata)?;
                values.push(val);
            }
            return Ok(format!("[{}]", values.join(", ")));
        }
    }

    // Handle composite types (structs)
    if let Some(def) = type_def.type_def.def.get("composite") {
        if let Some(fields) = def.get("fields") {
            if let Some(fields_array) = fields.as_array() {
                // Check if it's a tuple-like struct (unnamed fields)
                if fields_array.len() == 1 {
                    if let Some(field) = fields_array.get(0) {
                        if let Some(inner_type) = field.get("type") {
                            let inner_type_id = inner_type.as_u64().ok_or("Invalid type")? as u32;
                            // Unwrap single-field composite
                            return decode_field_by_type(cursor, inner_type_id, metadata);
                        }
                    }
                }

                // Multiple fields - decode each
                let mut field_values = Vec::new();
                for field in fields_array {
                    if let Some(inner_type) = field.get("type") {
                        let inner_type_id = inner_type.as_u64().ok_or("Invalid type")? as u32;
                        let val = decode_field_by_type(cursor, inner_type_id, metadata)?;

                        if let Some(name) = field.get("name") {
                            if let Some(name_str) = name.as_str() {
                                field_values.push(format!("{}: {}", name_str, val));
                            } else {
                                field_values.push(val);
                            }
                        } else {
                            field_values.push(val);
                        }
                    }
                }
                return Ok(format!("{{ {} }}", field_values.join(", ")));
            }
        }
    }

    // Handle variant types (enums)
    if let Some(def) = type_def.type_def.def.get("variant") {
        if let Some(variants) = def.get("variants") {
            if let Some(variants_array) = variants.as_array() {
                // Check if this is an Option type - it might encode Some without discriminant for indexed fields
                let is_option = type_def
                    .type_def
                    .path
                    .as_ref()
                    .map(|p| p.contains(&"Option".to_string()))
                    .unwrap_or(false);

                // Decode discriminant
                let discriminant = u8::decode(cursor)
                    .map_err(|e| format!("Failed to decode variant discriminant: {:?}", e))?;

                // Find matching variant
                for variant in variants_array {
                    if let Some(index) = variant.get("index") {
                        if index.as_u64() == Some(discriminant as u64) {
                            if let Some(name) = variant.get("name") {
                                let variant_name = name.as_str().unwrap_or("Unknown");

                                // Check if variant has fields
                                if let Some(fields) = variant.get("fields") {
                                    if let Some(fields_array) = fields.as_array() {
                                        if fields_array.is_empty() {
                                            return Ok(variant_name.to_string());
                                        }

                                        // Decode variant fields
                                        let mut field_values = Vec::new();
                                        for field in fields_array {
                                            if let Some(field_type) = field.get("type") {
                                                let field_type_id = field_type
                                                    .as_u64()
                                                    .ok_or("Invalid field type")?
                                                    as u32;
                                                let val = decode_field_by_type(
                                                    cursor,
                                                    field_type_id,
                                                    metadata,
                                                )?;
                                                field_values.push(val);
                                            }
                                        }

                                        if field_values.is_empty() {
                                            return Ok(variant_name.to_string());
                                        } else {
                                            return Ok(format!(
                                                "{}({})",
                                                variant_name,
                                                field_values.join(", ")
                                            ));
                                        }
                                    }
                                }

                                return Ok(variant_name.to_string());
                            }
                        }
                    }
                }

                // If we reach here and it's an Option, try assuming Some(T) without discriminant
                // This happens in ink! indexed fields sometimes
                if is_option {
                    // Create a new slice that includes the discriminant byte we just read
                    let remaining_len = cursor.len();
                    let mut temp_buffer = vec![discriminant];
                    temp_buffer.extend_from_slice(cursor);
                    let mut temp_cursor = &temp_buffer[..];

                    // Try to decode the inner type (assuming Some variant has one field)
                    for variant in variants_array {
                        if let Some(name) = variant.get("name") {
                            if name.as_str() == Some("Some") {
                                if let Some(fields) = variant.get("fields") {
                                    if let Some(fields_array) = fields.as_array() {
                                        if let Some(field) = fields_array.get(0) {
                                            if let Some(field_type) = field.get("type") {
                                                let field_type_id = field_type
                                                    .as_u64()
                                                    .ok_or("Invalid field type")?
                                                    as u32;
                                                match decode_field_by_type(
                                                    &mut temp_cursor,
                                                    field_type_id,
                                                    metadata,
                                                ) {
                                                    Ok(val) => {
                                                        // Success! Update the original cursor
                                                        let consumed =
                                                            temp_buffer.len() - temp_cursor.len();
                                                        *cursor = &cursor[consumed - 1..]; // -1 because we added discriminant
                                                        return Ok(format!("Some({})", val));
                                                    }
                                                    Err(_) => {
                                                        // Failed, continue to error
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return Err(format!("Unknown variant discriminant: {}", discriminant));
            }
        }
    }

    // Handle tuple types
    if let Some(def) = type_def.type_def.def.get("tuple") {
        if let Some(tuple_array) = def.as_array() {
            if tuple_array.is_empty() {
                // Unit type ()
                return Ok("()".to_string());
            }

            let mut values = Vec::new();
            for item in tuple_array {
                if let Some(type_id_val) = item.as_u64() {
                    let val = decode_field_by_type(cursor, type_id_val as u32, metadata)?;
                    values.push(val);
                }
            }
            return Ok(format!("({})", values.join(", ")));
        }
    }

    // Handle sequence types (Vec)
    if let Some(def) = type_def.type_def.def.get("sequence") {
        if let Some(inner_type) = def.get("type") {
            let inner_type_id = inner_type.as_u64().ok_or("Invalid sequence type")? as u32;

            // Decode compact-encoded length
            let length = parity_scale_codec::Compact::<u32>::decode(cursor)
                .map_err(|e| format!("Failed to decode Vec length: {:?}", e))?;

            let mut values = Vec::new();
            for _ in 0..length.0 {
                let val = decode_field_by_type(cursor, inner_type_id, metadata)?;
                values.push(val);
            }

            return Ok(format!("Vec[{}]", values.join(", ")));
        }
    }

    Err(format!(
        "Unsupported type definition: {:?}",
        type_def.type_def.def
    ))
}

/// Parse an event string value into a JSON value
///
/// Supports:
/// - Option<T>: Some(value) -> value, None -> null
/// - AccountID/Address: 0x... -> string
/// - Integers: 123 -> number (or string for large numbers)
/// - Strings: "text" -> string
///
/// # Arguments
/// * `value` - String representation of the value
///
/// # Returns
/// Parsed JSON value
pub fn parse_event_string(value: &str) -> JsonValue {
    let trimmed = value.trim();

    // Handle empty string
    if trimmed.is_empty() {
        return JsonValue::Null;
    }

    // Handle Option types: Some(value) or None
    if trimmed.starts_with("Some(") && trimmed.ends_with(')') {
        let inner = &trimmed[5..trimmed.len() - 1];
        return parse_event_string(inner);
    }

    if trimmed == "None" {
        return JsonValue::Null;
    }

    // Handle AccountID/Address (0x...)
    if trimmed.starts_with("0x") {
        return JsonValue::String(trimmed.to_string());
    }

    // Handle quoted strings
    if (trimmed.starts_with('"') && trimmed.ends_with('"'))
        || (trimmed.starts_with('\'') && trimmed.ends_with('\''))
    {
        let unquoted = &trimmed[1..trimmed.len() - 1];
        return JsonValue::String(unquoted.to_string());
    }

    // Handle large integers (keep as string to avoid precision loss)
    // U256 and similar large numbers should be strings
    if trimmed.chars().all(|c| c.is_ascii_digit()) && trimmed.len() > 15 {
        return JsonValue::String(trimmed.to_string());
    }

    // Handle regular integers
    if let Ok(num) = trimmed.parse::<i64>() {
        return json!(num);
    }

    // Default: return as string
    JsonValue::String(trimmed.to_string())
}
