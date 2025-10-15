// Copyright (c) 2025, Algorealm Inc.

use super::*;
use crate::{
    chain::polkadot::{
        prelude::{EventData, CONTRACTS_NODE_URL},
        Polkadot,
    },
    server::routes,
};
use axum::{
    http::{self, Method},
    routing::get,
    Extension, Router,
};
use futures::channel::oneshot;
use tokio::net::TcpListener;

use tower_http::cors::{Any, CorsLayer};

/// Configure the server and get it running.
pub async fn run() {
    // Initialize shared system state.
    let state = Triggr::new();

    // Connect to PassetHub to listen to chain events
    let api = Polkadot::connect(CONTRACTS_NODE_URL).await;

    // Create one-way channel to send decoded event from the listener task to the database
    // let (tx, rx) = oneshot::channel();

    // Spin up a task to listen to events
    // tokio::task::spawn(Polkadot::watch_event(api, tx));

    // CORS configuration
    let cors = CorsLayer::new()
        // Allow all origins in development
        .allow_origin(Any)
        // Allow common HTTP methods
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        // Allow common headers like Authorization
        .allow_headers([http::header::AUTHORIZATION, http::header::CONTENT_TYPE]);
    // Allow credentials if needed
    // .allow_credentials(true);

    // Server config
    let app = Router::new()
        .merge(routes::db_routes())
        .merge(routes::console_routes())
        .merge(routes::ws_route())
        .merge(routes::docs_routes())
        .with_state(state.clone())
        .layer(Extension(state)) // make `Triggr` available
        .layer(cors) // Add CORS
        .route("/health", get(|| async { "OK" }));

    // Deploy server
    let server_address = "0.0.0.0:5190";
    println!("Server running at {}", server_address);
    axum::serve(TcpListener::bind(server_address).await.unwrap(), app)
        .await
        .unwrap();
}
