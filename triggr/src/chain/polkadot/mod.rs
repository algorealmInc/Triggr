// Copyright (c) 2025, Algorealm Inc.

use scale_value::{Composite, Primitive, Value, ValueDef};
use serde_json::{json, Value as JsonValue};
use substrate_api_client::{
    ac_primitives::DefaultRuntimeConfig, rpc::JsonrpseeClient, Api, SubscribeEvents,
};
use futures::channel::oneshot::Sender;

pub mod decode;
pub mod prelude;
pub mod util;

use prelude::*;

/// Interface to handle all operations relating to the Polkadot chain.
#[derive(Clone, Default, Debug)]
pub struct Polkadot;

impl Polkadot {
    /// Connect to Passethub and listen for event changes
    pub async fn connect(address: &str) -> Api<DefaultRuntimeConfig, JsonrpseeClient> {
        println!("Connecting to {}", address);

        // Connect to node
        let client = JsonrpseeClient::new(address)
            .await
            .expect("Failed to connect to node");

        // Return node client
        Api::<DefaultRuntimeConfig, _>::new(client)
            .await
            .expect("Failed to create API")
    }

    /// Watch event and decode it before sending it to database layer.
    pub async fn watch_event(
        api: Api<DefaultRuntimeConfig, JsonrpseeClient>,
        tx: Sender<EventData>,
    ) {
        // Subscribe to events
        let mut sub = api
            .subscribe_events()
            .await
            .expect("Failed to subscribe to events");

        while let Some(events_result) = sub.next_events_from_metadata().await {
            match events_result {
                Ok(events) => {
                    println!("📦 Block: #{:?}", events.block_hash());

                    // Iterate through decoded events
                    for event in events.iter() {
                        match event {
                            Ok(event_details) => {
                                let pallet_name = event_details.pallet_name();

                                // Only process pallet Revive (contracts) events
                                if pallet_name != "Revive" {
                                    continue;
                                }

                                // Decode fields
                                match event_details.field_values() {
                                    Ok(fields) => {
                                        let field_vec: Vec<&Value<u32>> = fields.values().collect();

                                        // // Extract contract address (first field) and event data (second field)
                                        // if field_vec.len() >= 2 {
                                        //     if let Some(contract_address) = extract_bytes_from_nested(&field_vec[0]) {
                                        //         if let Some(event_bytes) = extract_bytes_from_nested(&field_vec[1]) {
                                        //             println!("   📍 Contract Address: 0x{}", hex::encode(&contract_address));
                                        //             println!("   📦 Event Data (hex): 0x{}", hex::encode(&event_bytes));
                                        //             println!("   📦 Decoded Event:");
                                        //             decode_contract_event_with_metadata(&event_bytes, &metadata);
                                        //         }
                                        //     }
                                        // }
                                    }
                                    Err(e) => {
                                        eprintln!("   ❌ Could not decode fields: {:?}", e);
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("❌ Could not decode event: {:?}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("⚠️ Error while receiving events: {:?}", e);
                }
            }
        }
    }
}
