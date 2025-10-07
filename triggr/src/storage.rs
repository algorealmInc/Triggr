// Copyright (c) 2025, Algorealm Inc.

// This module handles all internal storage operations for Triggr.
// We are using sled for the internal database storage. This is because it is fast and composable in a single binary.
// No external (network) dependencies.

use super::*;
use async_trait::async_trait;
use sled::Db;
use std::{collections::HashMap, fs, path::Path, sync::Arc};
use tokio::sync::{broadcast::{Sender, Receiver, self}, RwLock};

/// Subscriptions to track topics and help broadcast database changes to clients.
#[derive(Clone, Default)]
pub struct DbSubscriptions {
    pub topics: Arc<RwLock<HashMap<String, Sender<String>>>>,
}

impl DbSubscriptions {
    /// Check if a topic exists.
    pub async fn has_topic(&self, topic: &str) -> bool {
        let topics = self.topics.read().await;
        topics.contains_key(topic)
    }
}

// Implement `Subscribe` for DbSubscription
#[async_trait]
impl<T> Subscribe<T> for DbSubscriptions
where
    T: Clone + Send + Sync + 'static,
{
    /// Publish a message to all subscribers of a topic.
    async fn publish(&self, collection: &str, doc_id: &str, mut json: WsPayload) {
        let topics = self.topics.read().await;
        // Collection subscribers
        let key = format!("collection:{collection}:change");
        if let Some(sender) = topics.get(&key) {
            // Assign topic
            json.topic = key;
            if let Ok(json_string) = serde_json::to_string(&json) {
                // Ignore error if no active subscribers
                let _ = sender.send(json_string);
            }
        }

        // Document subscribers
        let key = format!("document:{collection}:{doc_id}:change");
        if let Some(sender) = topics.get(&key) {
            // Assign topic
            json.topic = key;
            if let Ok(json_string) = serde_json::to_string(&json) {
                // Ignore error if no active subscribers
                let _ = sender.send(json_string);
            }
        }
    }

    /// Subscribe to a topic (doc_id or collection).
    /// Creates the topic if it doesn't exist yet.
    async fn subscribe(&self, topic: &str) -> Receiver<String> {
        let mut topics = self.topics.write().await;

        // Get or insert the broadcast channel
        let sender = topics.entry(topic.to_string()).or_insert_with(|| {
            let (tx, _rx) = broadcast::channel(100);
            tx
        });

        sender.subscribe()
    }

    async fn unsubscribe(&self, topic: &str) {
        todo!()
    }
}

/// Concrete storage backend using Sled.
///
/// This store contains multiple sub-databases (trees) for:
/// - `projects`: for storing projects belonging to a user
/// - `app`: for storing document data (kv data)
/// - 'users`: for storing user data
#[derive(Clone)]
pub struct SledStore {
    /// Project store
    pub projects: Arc<Db>,
    /// App data store containing documents and collections
    pub app: Arc<Db>,
    /// Users store
    pub users: Arc<Db>,
    /// Subscription mechanism
    pub subscription: DbSubscriptions,
}

impl SledStore {
    /// Initialize the Sled store at the default path.
    pub fn new() -> Self {
        let projects_path = std::env::var("SAMARITAN_DB_PATH_PROJECTS")
            .unwrap_or_else(|_| DEFAULT_DB_PATH_PROJECTS.to_string());
        let app_path = std::env::var("SAMARITAN_DB_PATH_APP")
            .unwrap_or_else(|_| DEFAULT_DB_PATH_APP.to_string());
        let users_path = std::env::var("SAMARITAN_DB_PATH_USERS")
            .unwrap_or_else(|_| DEFAULT_DB_PATH_USERS.to_string());

        // Open or create storage directory
        fs::create_dir_all(&projects_path).expect(&format!("Failed to create {}", projects_path));
        fs::create_dir_all(&app_path).expect(&format!("Failed to create {}", app_path));
        fs::create_dir_all(&users_path).expect(&format!("Failed to create {}", users_path));

        // Initialize database
        let projects_db =
            ::sled::open(Path::new(&projects_path)).expect("Failed to open sled database");
        let app_db = ::sled::open(Path::new(&app_path)).expect("Failed to open sled database");
        let users_db = ::sled::open(Path::new(&users_path)).expect("Failed to open sled database");

        let db = Self {
            projects: Arc::new(projects_db),
            app: Arc::new(app_db),
            users: Arc::new(users_db),
        };
        db
    }
}
