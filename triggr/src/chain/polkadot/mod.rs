// Copyright (c) 2025, Algorealm Inc.

use substrate_api_client::{
    ac_primitives::DefaultRuntimeConfig, rpc::JsonrpseeClient, Api, SubscribeEvents,
};
use tokio::sync::oneshot::Sender;

pub mod decode;
pub mod util;
pub mod prelude;

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
    pub async fn watch_event(tx: Sender<EventData>, api: Api<DefaultRuntimeConfig, JsonrpseeClient>) {

    }
}
