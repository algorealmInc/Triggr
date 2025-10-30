// Copyright (c) 2025, Algorealm Inc.

// Triggr - A reactive database for onchain events.

use crate::{
    chain::polkadot::prelude::EventData,
    dsl::{Action, DslExecutor},
};
use chrono::Utc;
use serde_json::json;
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
                .filter(|t| t.rules.iter().any(|r| r.event_name.to_lowercase() == event_data.event_name.to_lowercase()))
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
        let _ = execute_actions(triggr.clone(), &trigger.project_id, action).await;

        // Update modified timestamp
        let mut updated_trigger = trigger.clone();
        updated_trigger.last_run = Utc::now().timestamp_millis() as u64;

        // Save trigger
        let _ = TriggerStore::store_trigger(&*triggr.store, &contract_addr, updated_trigger);
    }
}

/// Function to execute database actions and make database changes.
async fn execute_actions(triggr: Triggr, project_id: &str, action: Action) {
    // Unix timestamp
    let now = Utc::now().timestamp_millis() as u64;

    match action {
        // Update database
        Action::Update {
            collection,
            id,
            fields,
        } => {
            // Construct document
            let doc = Document {
                id,
                data: json!(fields),
                metadata: DocMetadata {
                    created_at: now,
                    updated_at: now,
                    version: None,
                    tags: Default::default(),
                },
            };

            // Execute database operation
            let _ = DocumentStore::update(&*triggr.store, project_id, &collection, doc).await;
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
            // Construct document
            let doc = Document {
                id,
                data: json!(fields),
                metadata: DocMetadata {
                    created_at: now,
                    updated_at: now,
                    version: None,
                    tags: Default::default(),
                },
            };

            // Execute database operation
            let _ = DocumentStore::update(&*triggr.store, project_id, &collection, doc).await;
        }

        // TODO!
        Action::Notify { .. } => {}
    }
}
