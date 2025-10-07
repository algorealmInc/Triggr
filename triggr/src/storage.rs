// Copyright (c) 2025, Algorealm Inc.

// This module handles all internal storage operations for Triggr.
// We are using sled for the internal database storage. This is because it is fast and composable in a single binary.
// No external (network) dependencies.

use super::*;
use async_trait::async_trait;
use sled::{Db, IVec};
use std::{collections::HashMap, fs, path::Path, sync::Arc};
use tokio::sync::{
    broadcast::{self, Receiver, Sender},
    RwLock,
};

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
            subscription: DbSubscriptions::default(),
        };
        db
    }
}

#[async_trait]
impl DocumentStore for SledStore {
    /// Build a namespaced key for storing a document.
    /// Pattern: `document::{project_id}::{collection}::{doc_id}`
    fn key(project_id: &str, collection: &str, doc_id: &str) -> String {
        format!("document::{project_id}::{collection}::{doc_id}")
    }

    /// Insert a new document into a collection.
    /// Overwrites any existing document with the same ID.
    async fn insert(
        &self,
        project_id: &str,
        collection: &str,
        doc: Document,
        subs: DbSubscriptions,
    ) -> StorageResult<()> {
        let key = DocumentStore::key(project_id, collection, &doc.id);
        let value = serde_json::to_vec(&doc)?;
        self.app.insert(key.as_bytes(), value)?;

        // Broadcast the insert event to all subscribed clients
        subs.publish(
            collection,
            &doc.id,
            WsPayload {
                op: String::from("insert"),
                topic: String::with_capacity(100),
                doc: doc.clone(),
            },
        )
        .await;

        Ok(())
    }

    /// Fetch a single document by ID.
    fn get(&self, project_id: &str, collection: &str, id: &str) -> StorageResult<Option<Document>> {
        let key = DocumentStore::key(project_id, collection, id);
        if let Some(val) = self.app.get(key.as_bytes())? {
            let doc: Document = serde_json::from_slice(&val)?;
            Ok(Some(doc))
        } else {
            Ok(None)
        }
    }

    /// Update an existing document.
    /// (Internally just calls `insert`, since sled overwrites by key.)
    async fn update(
        &self,
        project_id: &str,
        collection: &str,
        doc: Document,
        subs: DbSubscriptions,
    ) -> StorageResult<()> {
        self.insert(project_id, collection, doc, subs).await
    }

    /// Delete a document from a collection by ID.
    async fn delete(
        &self,
        project_id: &str,
        collection: &str,
        id: &str,
        subs: DbSubscriptions,
    ) -> StorageResult<()> {
        let key = DocumentStore::key(project_id, collection, id);

        // Delete and returns the old value (if any)
        let old_value = self
            .app
            .remove(&key)?
            .map(|ivec| String::from_utf8_lossy(&ivec).to_string());

        // Only use the old value to notify subscribers, not in the publish API
        if let Some(doc) = old_value {
            if let Ok(doc) = serde_json::from_str(&doc) {
                subs.publish(
                    collection,
                    id,
                    WsPayload {
                        op: String::from("delete"),
                        topic: String::with_capacity(100),
                        doc,
                    },
                )
                .await;
            }
        }

        Ok(())
    }

    /// List all documents in a given collection.
    /// Uses prefix iteration over keys: `document::{project_id}::{collection}::`
    fn list(&self, project_id: &str, collection: &str) -> StorageResult<Vec<Document>> {
        let prefix = format!("document::{project_id}::{collection}::");
        let mut docs = Vec::new();

        for item in self.app.scan_prefix(prefix.as_bytes()) {
            let (_k, v): (IVec, IVec) = item?;
            let doc: Document = serde_json::from_slice(&v)?;
            docs.push(doc);
        }

        Ok(docs)
    }

    /// List all collections for a project.
    /// Scans keys and extracts the collection name from the namespace.
    fn list_collections(&self, project_id: &str) -> StorageResult<Vec<String>> {
        let prefix = format!("document::{project_id}::");
        let mut collections = std::collections::HashSet::new();

        for item in self.app.scan_prefix(prefix.as_bytes()) {
            let (k, _v): (IVec, IVec) = item?;
            let key_str = String::from_utf8(k.to_vec())?;

            // key format: document::{project_id}::{collection}::{doc_id}
            if let Some(parts) = key_str.split("::").collect::<Vec<_>>().get(2) {
                collections.insert(parts.to_string());
            }
        }

        Ok(collections.into_iter().collect())
    }

    /// Check if a collection exists for a project.
    fn collection_exists(&self, project_id: &str, name: &str) -> StorageResult<bool> {
        let prefix = format!("document::{project_id}::{name}::");
        let mut iter = self.app.scan_prefix(prefix.as_bytes());
        Ok(iter.next().is_some())
    }
}

// Implement ProjectStore for SledStore
impl ProjectStore for SledStore {
    fn create(&self, project: Project) -> StorageResult<String> {
        // Generate a random 32-character alphanumeric key.
        let key = util::generate_nonce::<32>();

        // Serialize the ApiKey for storage in sled
        let bytes = bincode::serialize(&project).map_err(|e| e.to_string())?;

        // Store in the `projects` tree
        self.projects
            .insert(key.as_bytes(), bytes)
            .map_err(|e| e.to_string())?;

        // Store the new project in relation to a user.
        self.add_user_project(&project.owner.clone(), project)?;

        Ok(key)
    }

    fn get(&self, key: &str) -> StorageResult<Option<Project>> {
        match self.projects.get(key.as_bytes()) {
            // Found key → deserialize into ApiKey
            Ok(Some(ivec)) => {
                let project: Project = bincode::deserialize(&ivec).map_err(|e| e.to_string())?;
                Ok(Some(project))
            }
            // Key not found
            Ok(None) => Ok(None),
            // DB error
            Err(e) => Err(e.to_string().into()),
        }
    }

    fn delete(&self, key: &str, owner: &str) -> StorageResult<()> {
        // Look up the project
        let Some(bytes) = self
            .projects
            .get(key.as_bytes())
            .map_err(|e| e.to_string())?
        else {
            return Err(format!("Project with key {} not found", key).into());
        };

        // Deserialize the project
        let project: Project = bincode::deserialize(&bytes).map_err(|e| e.to_string())?;

        // Verify ownership
        if project.owner != owner {
            return Err("Unauthorized: owner mismatch".into());
        }

        // Delete the project
        self.projects
            .remove(key.as_bytes())
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Get all projects of a user
    fn get_user_projects(&self, user_id: &str) -> StorageResult<Vec<Project>> {
        if let Some(value) = self.users.get(user_id)? {
            let projects: Vec<Project> =
                bincode::deserialize(&value).map_err(|e| format!("Deserialization error: {e}"))?;
            Ok(projects)
        } else {
            Ok(Vec::new())
        }
    }
}
