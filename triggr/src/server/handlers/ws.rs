// Copyright (c) 2025, Algorealm Inc.

// This module handles websockets request and responses.

use super::*;
use axum::extract::Query;
use axum::extract::ws::Message;
use axum::http::{HeaderMap, StatusCode};
use axum::{
    extract::{State, WebSocketUpgrade, ws::WebSocket},
    response::IntoResponse,
};
use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use tokio::sync::broadcast::Receiver;
use tokio::sync::mpsc;

/// Schema of JSON data sent from the client
#[derive(Serialize, Deserialize)]
struct WsJson {
    data: String,
}

#[derive(Deserialize)]
pub struct WsParams {
    api_key: Option<String>,
}

// Handle websocket requests.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    headers: HeaderMap,
    Query(params): Query<WsParams>,
    State(triggr): State<Triggr>,
) -> impl IntoResponse {
    // Try to get API key from header
    let header_key = headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    // Or from query parameters
    let api_key = header_key.or(params.api_key);

    match api_key {
        Some(key) => match ProjectStore::get(&*triggr.store, &key) {
            Ok(_) => ws.on_upgrade(move |socket| handle_socket(socket, triggr)),
            Err(_) => StatusCode::UNAUTHORIZED.into_response(),
        },
        None => StatusCode::UNAUTHORIZED.into_response(),
    }
}

/// Recieve websocket commands and track database events to return to clients.
async fn handle_socket(mut socket: WebSocket, triggr: Triggr) {
    // Outbound channel (task-safe queue for sending messages)
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Track client subscriptions
    let mut subscriptions: HashMap<String, Receiver<String>> = HashMap::new();

    loop {
        tokio::select! {
            // Incoming message from client
            Some(Ok(msg)) = socket.next() => {
                if let Message::Text(text) = msg {
                    if let Ok(ws_data) = serde_json::from_str::<WsJson>(&text) {
                        let text = ws_data.data;

                        if text.starts_with("subscribe:") {
                            let topic = text.trim_start_matches("subscribe:").to_string();
                            let rx_sub = triggr.store.subscriptions.subscribe(&topic).await;
                            subscriptions.insert(topic.clone(), rx_sub);

                            // Send ack through channel
                            let _ = tx.send(json!({
                                "op": "subscribe",
                                "topic": topic
                            }).to_string());
                        }
                        else if text.starts_with("unsubscribe:") {
                            let topic = text.trim_start_matches("unsubscribe:").to_string();
                            subscriptions.remove(&topic);

                            // Send ack
                            let _ = tx.send(json!({
                                "op": "unsubscribe",
                                "topic": topic
                            }).to_string());
                        }
                    }
                }
            }

            // Messages from subscribed topics
            _ = async {
                for (_, rx_sub) in &mut subscriptions {
                    if let Ok(msg) = rx_sub.try_recv() {
                        let _ = tx.send(msg);
                    }
                }
            } => {}

            // Outbound queue -> socket
            Some(out_msg) = rx.recv() => {
                if socket.send(Message::Text(out_msg.into())).await.is_err() {
                    break; // socket closed
                }
            }
        }
    }
}
