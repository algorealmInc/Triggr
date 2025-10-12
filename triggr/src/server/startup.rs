// Copyright (c) 2025, Algorealm Inc.

use super::*;
use crate::server::routes;
use axum::{routing::get, Extension, Router};
use tokio::net::TcpListener;

/// Configure the server and get it running.
pub async fn run() {
    // Initialize shared system state.
    let state = Triggr::new();

    // Server config
    let app = Router::new()
        .merge(routes::db_routes())
        .merge(routes::console_routes())
        .merge(routes::ws_route())
        .with_state(state.clone())
        .layer(Extension(state)) // make `Triggr` available
        .route("/health", get(|| async { "OK" }));

    // Deploy server
    let server_address = "0.0.0.0:5190";
    println!("Server running at {}", server_address);
    axum::serve(TcpListener::bind(server_address).await.unwrap(), app)
        .await
        .unwrap();
}
