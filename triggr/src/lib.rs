// Copyright (c) 2025, Algorealm Inc.

// Triggr - A reactive database for onchain events.

use std::collections::HashMap;

use crate::{
    chain::polkadot::prelude::EventData,
    dsl::{Action, DslExecutor},
};
use chrono::Utc;
use serde_json::{json, Value};
use tokio::sync::mpsc::Receiver;

mod chain;
mod dsl;
mod prelude;
mod server;
mod storage;
mod util;

// Re-export prelude definitions
pub(crate) use prelude::*;

pub use server::startup::run as start;

/// Function to handle blockchain events and execute triggers.
pub async fn handle_chain_events(triggr: Triggr, mut rx: Receiver<(String, EventData)>) {
    // Recieve stream data
    while let Some((contract_addr, event_data)) = rx.recv().await {
        // Load triggers from db
        if let Ok(triggers) = TriggerStore::list_triggers(&*triggr.store, &contract_addr) {
            // Filter triggers based on event name
            let triggers = triggers
                .iter()
                .filter(|t| {
                    t.rules.iter().any(|r| {
                        r.event_name.to_lowercase() == event_data.event_name.to_lowercase()
                    })
                })
                .cloned()
                .collect::<Vec<Trigger>>();

            // Spin up tasks to execute tiggers
            for trigger in triggers {
                // Make sure it hasn't been disabled
                if trigger.active {
                    tokio::task::spawn(execute_trigger(
                        triggr.clone(),
                        contract_addr.clone(),
                        trigger,
                        event_data.clone(),
                    ));
                }
            }
        }
    }
}

/// Function to execute trigger.
async fn execute_trigger(
    triggr: Triggr,
    contract_addr: String,
    trigger: Trigger,
    event: EventData,
) {
    // Get actions to execute
    let actions = trigger
        .rules
        .iter()
        .filter_map(|rule| DslExecutor::execute_rule(rule, &event))
        .flatten()
        .collect::<Vec<Action>>();

    for action in actions {
        // Execute actions and make db state changes
        let _ = execute_actions(triggr.clone(), &trigger.project_id, action, event.clone()).await;

        // Update modified timestamp
        let mut updated_trigger = trigger.clone();
        updated_trigger.last_run = Utc::now().timestamp_millis() as u64;

        // Save trigger
        let _ = TriggerStore::store_trigger(&*triggr.store, &contract_addr, updated_trigger);
    }
}

/// Function to execute database actions and make database changes.
async fn execute_actions(triggr: Triggr, project_id: &str, action: Action, event: EventData) {
    // Unix timestamp
    let now = Utc::now().timestamp_millis() as u64;

    match action {
        // Update database
        Action::Update {
            collection,
            id,
            fields,
        } => {
            // We will check if any action field references event data
            let new_fields = if fields
                .iter()
                .any(|(_, val)| val.to_string().contains("events."))
            {
                // Transpose it with event data
                transpose_data_fields(fields, event)
            } else {
                fields
            };

            // Construct document
            let doc = Document {
                id,
                data: json!(new_fields),
                metadata: DocMetadata {
                    created_at: now,
                    updated_at: now,
                    version: None,
                    tags: Default::default(),
                },
            };

            // Execute database operation
            // Make sure there are no fields left to transpose
            if !new_fields
                .iter()
                .any(|(_, val)| val.to_string().contains("events."))
            {
                let _ = DocumentStore::update(&*triggr.store, project_id, &collection, doc).await;
            }
        }
        // Delete database entry
        Action::Delete { collection, id } => {
            let _ = DocumentStore::delete(&*triggr.store, project_id, &collection, &id).await;
        }
        // Insert into database
        Action::Insert {
            id,
            collection,
            fields,
        } => {
            // We will check if any action field references event data
            let new_fields = if fields
                .iter()
                .any(|(_, val)| val.to_string().contains("events."))
            {
                // Transpose it with event data
                transpose_data_fields(fields, event)
            } else {
                fields
            };

            // Construct document
            let doc = Document {
                id,
                data: json!(new_fields),
                metadata: DocMetadata {
                    created_at: now,
                    updated_at: now,
                    version: None,
                    tags: Default::default(),
                },
            };

            // Execute database operation
            // Make sure there are no fields left to transpose
            if !new_fields
                .iter()
                .any(|(_, val)| val.to_string().contains("events."))
            {
                let _ = DocumentStore::insert(&*triggr.store, project_id, &collection, doc, false).await;
            }
        }

        // TODO!
        Action::Notify { .. } => {}
    }
}

/// Transpose the fields in a document that references event data
fn transpose_data_fields(
    mut fields: HashMap<String, Value>,
    event: EventData,
) -> HashMap<String, Value> {
    // Iterate through all fields and replace event references
    for (_, field_value) in fields.iter_mut() {
        if let Some(value_str) = field_value.as_str() {
            // Check if this is an event reference (e.g., "events.ValueChanged.value")
            if value_str.starts_with("events.") {
                let parts: Vec<&str> = value_str.split('.').collect();

                // Format: events.<EventName>.<field_name>
                if parts.len() == 3 && parts[0] == "events" {
                    let referenced_event = parts[1];
                    let referenced_field = parts[2];

                    // Check if this matches the current event
                    if referenced_event.eq_ignore_ascii_case(&event.event_name) {
                        // Try to get the actual value from event fields
                        if let Some(actual_value) = event.fields.get(referenced_field) {
                            // Clone and process the value
                            let processed_value = util::process_event_value(actual_value);
                            *field_value = processed_value;
                        }
                    }
                }
            }
        } else if let Some(obj) = field_value.as_object_mut() {
            // Recursively handle nested objects
            let nested_fields: HashMap<String, Value> =
                obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
            let transposed = transpose_data_fields(nested_fields, event.clone());
            *obj = transposed.into_iter().collect();
        } else if let Some(arr) = field_value.as_array_mut() {
            // Recursively handle arrays
            for item in arr.iter_mut() {
                if let Some(obj) = item.as_object_mut() {
                    let nested_fields: HashMap<String, Value> =
                        obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
                    let transposed = transpose_data_fields(nested_fields, event.clone());
                    *obj = transposed.into_iter().collect();
                }
            }
        }
    }

    fields
}
