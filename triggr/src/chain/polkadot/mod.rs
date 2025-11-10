// Copyright (c) 2025, Algorealm Inc.

// This module contains all operations and data structures involving to interact with a Polkadot chain.

use scale_value::Value;
use substrate_api_client::{
    ac_primitives::DefaultRuntimeConfig, rpc::JsonrpseeClient, Api, SubscribeEvents,
};
use tokio::sync::mpsc::Sender;

pub mod prelude;
pub mod util;

use prelude::*;
use tracing::info;
use parity_scale_codec::Decode;

use crate::{chain::polkadot::util::*, prelude::Triggr};

/// Interface to handle all operations relating to the Polkadot chain.
#[derive(Clone, Default, Debug)]
pub struct Polkadot;

impl Polkadot {
    /// Connect to a contracts node and listen for event changes
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
        tx: Sender<(String, EventData)>,
        triggr: Triggr,
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

                                println!("[{}]", pallet_name);

                                // Only process pallet Revive (contracts) events
                                if pallet_name != "Revive" {
                                    continue;
                                }

                                // Decode fields
                                match event_details.field_values() {
                                    Ok(fields) => {
                                        let field_vec: Vec<&Value<u32>> = fields.values().collect();

                                        // println!("{:?}", field_vec[1]);

                                        // Extract contract address (first field) and event data (second field)
                                        if field_vec.len() >= 2 {
                                            if let Some(contract_address) =
                                                extract_bytes_from_nested(&field_vec[0])
                                            {
                                                if let Some(event_bytes) =
                                                    extract_bytes_from_nested(&field_vec[1])
                                                {
                                                    let addr_bytes = format!(
                                                        "0x{}",
                                                        hex::encode(&contract_address)
                                                    );

                                                    println!(
                                                        "   📍 Contract Address: {}",
                                                        addr_bytes
                                                    );
                                                    println!(
                                                        "   📦 Event Data (hex): 0x{}",
                                                        hex::encode(&event_bytes)
                                                    );

                                                    // Only try to decode contracts we care about
                                                    let cache = triggr.cache.read().await;
                                                    // println!("{:#?}", cache.contract);
                                                    if let Some(metadata) =
                                                        cache.contract.get(&addr_bytes)
                                                    {
                                                        let mut cursor = &event_bytes[..];

                                                        // ink! stores event index in the first byte
                                                        let event_index = u8::decode(&mut cursor);

                                                        println!("EEEII: {:?}", event_index);
                                                        // println!("{:?}", metadata);
                                                        // println!("{}", addr_bytes);
                                                        // Decode contract event and send to handler
                                                        decode_contract_event_with_metadata(
                                                            tx.clone(),
                                                            addr_bytes,
                                                            &event_bytes,
                                                            metadata,
                                                        )
                                                        .await;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        println!("   ❌ Could not decode fields: {:?}", e);
                                    }
                                }
                            }
                            Err(e) => {
                                println!("❌ Could not decode event: {:?}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    println!("⚠️ Error while receiving events: {:?}", e);
                }
            }
        }
    }
}
