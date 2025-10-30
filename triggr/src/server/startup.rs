// Copyright (c) 2025, Algorealm Inc.

// This module configures and starts the database server. 
// It connects to a Polkadot Contracts Node (Paseo) to listen for contracts events and pass it internally for handling.

use super::*;
use crate::{
    chain::polkadot::{prelude::CONTRACTS_NODE_URL, Polkadot},
    server::routes, util::introduce_triggr,
};
use axum::{http::Method, routing::get, Extension, Router};
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};

/// Configure the server and get it running.
pub async fn run() {
    use dotenvy::dotenv;
    dotenv().ok(); // load from .env

    // Initialize shared system state.
    let state = Triggr::new();

    // Create one-way channel to send decoded event from the listener task to the database
    let (tx, rx) = mpsc::channel(100);

    // Spin up a task to listen to blockchain events and execute triggers configured to respond to them
    tokio::task::spawn(handle_chain_events(state.clone(), rx));

    // Create LocalSet for !Send futures
    let local = tokio::task::LocalSet::new();

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    // Server configuration
    let app = Router::new()
        .merge(routes::db_routes())
        .merge(routes::trigger_routes())
        .merge(routes::console_routes())
        .merge(routes::ws_route())
        .merge(routes::docs_routes())
        .with_state(state.clone())
        .layer(Extension(state.clone()))
        .layer(cors)
        .route("/health", get(|| async { "OK" }));

    let server_address = "0.0.0.0:5190";
    let listener = TcpListener::bind(server_address).await.unwrap();

    // Introduce database
    introduce_triggr();

    println!("🚀 Starting server at {}", server_address);

    // Run both the watcher and the server inside the LocalSet
    local
        .run_until(async move {
            // Spawn the !Send watcher locally
            tokio::task::spawn_local(async move {
                println!("🎯 Connecting to Polkadot node...");
                let api = Polkadot::connect(CONTRACTS_NODE_URL).await;
                println!("🔗 Connected. Starting event watcher...");
                Polkadot::watch_event(api, tx, state.clone()).await;
            });

            // Start the Axum server
            println!("🌐 HTTP server is running...");
            if let Err(err) = axum::serve(listener, app).await {
                eprintln!("Server error: {:?}", err);
            }
        })
        .await;
}
