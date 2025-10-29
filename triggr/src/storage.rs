// Copyright (c) 2025, Algorealm Inc.

// This module handles all internal storage operations for Triggr.
// We are using sled for the internal database storage. This is because it is fast and composable in a single binary.
// No external (network) dependencies.

use crate::util::encrypt;

use super::*;
use async_trait::async_trait;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sled::{Db, IVec};
use utoipa::ToSchema;
use std::{collections::HashMap, env, fs, path::Path, sync::Arc};
use tokio::sync::{
    broadcast::{self, Receiver, Sender},
    RwLock,
};

/// Metadata database entry
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Metadata {
    pub addr: String,
    pub path: String,
}

/// Summary statistics for a collection.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CollectionSummary {
    pub name: String,
    pub count: usize,
    pub last_updated: u64,
}

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

// Implement DbSubscription
impl DbSubscriptions {
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
    pub async fn subscribe(&self, topic: &str) -> Receiver<String> {
        let mut topics = self.topics.write().await;

        // Get or insert the broadcast channel
        let sender = topics.entry(topic.to_string()).or_insert_with(|| {
            let (tx, _rx) = broadcast::channel(100);
            tx
        });

        sender.subscribe()
    }
}

/// Concrete storage backend using Sled.
///
/// This store contains multiple sub-databases (trees) for:
/// - `projects`: for storing projects belonging to a user
/// - `app`: for storing document data (kv data)
/// - 'users`: for storing user data
#[derive(Clone)]
pub struct Sled {
    /// Project store
    pub projects: Arc<Db>,
    /// App data store containing documents and collections
    pub app: Arc<Db>,
    /// Users store
    pub users: Arc<Db>,
    /// Contract metadata store
    pub metadata: Arc<Db>,
    /// Trigger store
    pub triggers: Arc<Db>,
    /// Subscription mechanism
    pub subscriptions: DbSubscriptions,
}

impl Sled {
    /// Initialize the Sled store at the default paths.
    pub fn new() -> Self {
        let projects_path = std::env::var("TRIGGR_DB_PATH_PROJECTS")
            .unwrap_or_else(|_| DEFAULT_DB_PATH_PROJECTS.to_string());
        let app_path =
            std::env::var("TRIGGR_DB_PATH_APP").unwrap_or_else(|_| DEFAULT_DB_PATH_APP.to_string());
        let users_path = std::env::var("TRIGGR_DB_PATH_USERS")
            .unwrap_or_else(|_| DEFAULT_DB_PATH_USERS.to_string());
        let meta_path = std::env::var("TRIGGR_DB_PATH_METADATA")
            .unwrap_or_else(|_| DEFAULT_DB_PATH_METADATA.to_string());
        let trigger_path = std::env::var("TRIGGR_TRIGGER_PATH_METADATA")
            .unwrap_or_else(|_| DEFAULT_TRIGGER_PATH_METADATA.to_string());

        // Open or create storage directory
        fs::create_dir_all(&projects_path).expect(&format!("Failed to create {}", projects_path));
        fs::create_dir_all(&app_path).expect(&format!("Failed to create {}", app_path));
        fs::create_dir_all(&users_path).expect(&format!("Failed to create {}", users_path));
        fs::create_dir_all(&meta_path).expect(&format!("Failed to create {}", meta_path));
        fs::create_dir_all(&trigger_path).expect(&format!("Failed to create {}", trigger_path));

        // Initialize database
        let projects_db =
            ::sled::open(Path::new(&projects_path)).expect("Failed to open sled database");
        let app_db = ::sled::open(Path::new(&app_path)).expect("Failed to open sled database");
        let users_db = ::sled::open(Path::new(&users_path)).expect("Failed to open sled database");
        let meta_db = ::sled::open(Path::new(&meta_path)).expect("Failed to open sled database");
        let trigger_db =
            ::sled::open(Path::new(&trigger_path)).expect("Failed to open sled database");

        Self {
            projects: Arc::new(projects_db),
            app: Arc::new(app_db),
            users: Arc::new(users_db),
            metadata: Arc::new(meta_db),
            triggers: Arc::new(trigger_db),
            subscriptions: DbSubscriptions::default(),
        }
    }

    /// Helper function that receives a user ID and stores the API keys
    /// of projects associated with it.
    pub fn add_user_project(&self, user_id: &str, project: Project) -> StorageResult<()> {
        let mut projects: Vec<Project> = match self.users.get(user_id)? {
            Some(value) => {
                // Try to deserialize, fallback to empty vec if corrupted
                serde_json::from_slice(&value).unwrap_or_else(|_| Vec::new())
            }
            None => Vec::new(),
        };

        // Avoid duplicates by checking project.id
        if !projects.iter().any(|p| p.id == project.id) {
            projects.push(project);
        }

        let encoded = serde_json::to_vec(&projects)
            .map_err(|e| format!("Failed to serialize projects: {}", e))?;
        self.users.insert(user_id, encoded)?;

        Ok(())
    }

    /// Store or update unique (addr, path) entries under a single key ("HANNAH")
    pub fn store_metadata_entry(&self, addr: &str, path: &str) -> StorageResult<()> {
        const KEY: &str = "HANNAH";

        // Fetch existing entries (or start with an empty vector)
        let mut entries: Vec<Metadata> = match self.metadata.get(KEY)? {
            Some(bytes) => {
                // Try to deserialize, fallback to empty vec if corrupted
                serde_json::from_slice(&bytes).unwrap_or_else(|_| Vec::new())
            }
            None => vec![],
        };

        // Check if an entry with the same addr already exists
        if !entries.iter().any(|e| e.addr == addr) {
            entries.push(Metadata {
                addr: addr.to_string(),
                path: path.to_string(),
            });
        }

        // Serialize updated entries
        let bytes = serde_json::to_vec(&entries)
            .map_err(|e| format!("Failed to serialize entries: {}", e))?;

        // Store and flush
        self.metadata.insert(KEY, bytes)?;
        self.metadata.flush()?; // persist immediately

        Ok(())
    }

    /// Retrieve all stored entries
    pub fn get_metadata_entries(&self) -> StorageResult<Vec<Metadata>> {
        const KEY: &str = "HANNAH";

        match self.metadata.get(KEY)? {
            Some(bytes) => {
                let entries: Vec<Metadata> = serde_json::from_slice(&bytes)
                    .unwrap_or_else(|_| Vec::new());
                Ok(entries)
            }
            None => Ok(vec![]),
        }
    }
}

#[async_trait]
impl DocumentStore for Sled {
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
        mut doc: Document,
        update: bool,
    ) -> StorageResult<()> {
        // Unix timestamp
        let now = Utc::now().timestamp_millis() as u64;

        // Document metadata
        let metadata = if !update {
            DocMetadata {
                created_at: now,
                updated_at: now,
                version: None,
                tags: Default::default(),
            }
        } else {
            DocMetadata {
                updated_at: now,
                ..doc.metadata
            }
        };

        doc.metadata = metadata;

        let key = <Sled as DocumentStore>::key(project_id, collection, &doc.id);
        let value = serde_json::to_vec(&doc)?;
        self.app.insert(key.as_bytes(), value)?;

        // Broadcast the insert event to all subscribed clients
        self.subscriptions
            .publish(
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
        let key = <Sled as DocumentStore>::key(project_id, collection, id);
        if let Some(val) = self.app.get(key.as_bytes())? {
            let doc: Document = serde_json::from_slice(&val)?;
            Ok(Some(doc))
        } else {
            Ok(None)
        }
    }

    /// Update an existing document.
    /// (Internally just calls `insert`, since sled overwrites by key.)
    async fn update(&self, project_id: &str, collection: &str, doc: Document) -> StorageResult<()> {
        self.insert(project_id, collection, doc, true).await
    }

    /// Delete a document from a collection by ID.
    async fn delete(&self, project_id: &str, collection: &str, id: &str) -> StorageResult<()> {
        let key = <Self as DocumentStore>::key(project_id, collection, id);

        // Delete and returns the old value (if any)
        let old_value = self
            .app
            .remove(&key)?
            .map(|ivec| String::from_utf8_lossy(&ivec).to_string());

        // Only use the old value to notify subscribers, not in the publish API
        if let Some(doc) = old_value {
            if let Ok(doc) = serde_json::from_str(&doc) {
                self.subscriptions
                    .publish(
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

    /// List all collections for a given project, including document count and
    /// latest update timestamp.
    ///
    /// Scans keys with the prefix: `document::{project_id}::`
    fn list_collections(&self, project_id: &str) -> StorageResult<Vec<CollectionSummary>> {
        let prefix = format!("document::{project_id}::");
        let mut collections = std::collections::HashSet::new();

        // 🧩 1. Extract unique collection names
        for item in self.app.scan_prefix(prefix.as_bytes()) {
            let (k, _v): (IVec, IVec) = item?;
            let key_str = String::from_utf8(k.to_vec())?;

            // key format: document::{project_id}::{collection}::{doc_id}
            if let Some(parts) = key_str.split("::").collect::<Vec<_>>().get(2) {
                collections.insert(parts.to_string());
            }
        }

        // 🧮 2. For each collection, compute stats (count + last_updated)
        let mut summaries = Vec::new();

        for collection in collections {
            let (count, last_updated) = self.collection_stats(project_id, &collection)?;
            summaries.push(CollectionSummary {
                name: collection,
                count,
                last_updated,
            });
        }

        Ok(summaries)
    }

    /// Helper to return stats for a single collection
    fn collection_stats(&self, project_id: &str, collection: &str) -> StorageResult<(usize, u64)> {
        let prefix = format!("document::{project_id}::{collection}::");
        let mut count = 0usize;
        let mut latest_update = 0u64;

        for item in self.app.scan_prefix(prefix.as_bytes()) {
            let (_k, v): (IVec, IVec) = item?;
            let doc: Document = serde_json::from_slice(&v)?;

            count += 1;
            if doc.metadata.updated_at > latest_update {
                latest_update = doc.metadata.updated_at;
            }
        }

        Ok((count, latest_update))
    }

    /// Check if a collection exists for a project.
    fn collection_exists(&self, project_id: &str, name: &str) -> StorageResult<bool> {
        let prefix = format!("document::{project_id}::{name}::");
        let mut iter = self.app.scan_prefix(prefix.as_bytes());
        Ok(iter.next().is_some())
    }
}

// Implement ProjectStore for Sled
impl ProjectStore for Sled {
    fn create(&self, project: &mut Project) -> StorageResult<()> {
        // Generate a random 32-character alphanumeric key.
        let key = util::generate_nonce::<32>();

        // addr the API key to be used as project ID
        let encryption_key = env::var("TRIGGR_ENCRYPTION_KEY")?;
        let crypt_key = encrypt(&key, &encryption_key)?;

        // Update encrypted key
        project.api_key = crypt_key.clone();

        // Serialize the Project for storage in sled
        let bytes = serde_json::to_vec(&project)
            .map_err(|e| format!("Failed to serialize project: {}", e))?;

        // Store in the `projects` tree
        self.projects
            .insert(key.as_bytes(), bytes)
            .map_err(|e| e.to_string())?;

        // Store the new project in relation to a user.
        self.add_user_project(&project.owner.clone(), project.clone())?;

        Ok(())
    }

    fn get(&self, key: &str) -> StorageResult<Option<Project>> {
        match self.projects.get(key.as_bytes()) {
            // Found key → deserialize into Project
            Ok(Some(ivec)) => {
                let project: Project = serde_json::from_slice(&ivec)
                    .map_err(|e| format!("Failed to deserialize project: {}", e))?;
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
        let project: Project = serde_json::from_slice(&bytes)
            .map_err(|e| format!("Failed to deserialize project: {}", e))?;

        // Verify ownership
        if project.owner != owner {
            return Err("Unauthorized: owner mismatch".into());
        }

        // Delete the project
        self.projects
            .remove(key.as_bytes())
            .map_err(|e| e.to_string())?;

        // Load user projects
        let mut projects: Vec<Project> = match self.users.get(owner.as_bytes())? {
            Some(value) => {
                // Try to deserialize, fallback to empty vec if corrupted
                serde_json::from_slice(&value).unwrap_or_else(|_| Vec::new())
            }
            None => Vec::new(),
        };

        // Filter out the deleted project
        projects.retain(|p| p.id != project.id);

        // Serialize and save the updated list
        let serialized = serde_json::to_vec(&projects)
            .map_err(|e| format!("Failed to serialize user projects: {}", e))?;
        self.users.insert(owner.as_bytes(), serialized)?;

        Ok(())
    }

    /// Get all projects of a user
    fn get_user_projects(&self, user_id: &str) -> StorageResult<Vec<Project>> {
        match self.users.get(user_id)? {
            Some(value) => {
                let projects: Vec<Project> = serde_json::from_slice(&value)
                    .unwrap_or_else(|_| Vec::new());
                Ok(projects)
            }
            None => Ok(Vec::new()),
        }
    }
}

impl TriggerStore for Sled {
    /// Store (append) a new trigger for a given contract.
    fn store_trigger(&self, contract_addr: &str, trigger: Trigger) -> StorageResult<()> {
        let key = contract_addr.as_bytes();
    
        // Try to load existing triggers, fallback to empty vec on error
        let mut triggers: Vec<Trigger> = match self.triggers.get(key)? {
            Some(bytes) => match serde_json::from_slice(&bytes) {
                Ok(list) => list,
                Err(_) => {
                    // corrupted data, start fresh
                    vec![]
                }
            },
            None => vec![],
        };
    
        // Add or replace trigger with same ID
        if let Some(existing) = triggers.iter_mut().find(|t| t.id == trigger.id) {
            *existing = trigger;
        } else {
            triggers.push(trigger);
        }
    
        // Serialize and store
        let encoded = serde_json::to_vec(&triggers)
            .map_err(|e| format!("Failed to serialize triggers: {}", e))?;
        self.triggers.insert(key, encoded)?;
        self.triggers.flush()?;
        Ok(())
    }

    /// Retrieve a specific trigger by contract address and trigger id.
    fn get_trigger(&self, contract_addr: &str, name: &str) -> StorageResult<Trigger> {
        let key = contract_addr.as_bytes();

        let bytes = self.triggers.get(key)?.ok_or_else(|| {
            StorageError::NotFound(format!("No triggers found for contract {contract_addr}"))
        })?;

        let triggers: Vec<Trigger> = serde_json::from_slice(&bytes)
            .map_err(|e| format!("Failed to deserialize triggers: {}", e))?;

        triggers.into_iter().find(|t| t.id == name).ok_or_else(|| {
            StorageError::NotFound(format!("No trigger with id {name} for {contract_addr}"))
        })
    }

    /// Update active/inactive state of a specific trigger.
    fn set_trigger_state(
        &self,
        contract_addr: &str,
        trigger_id: &str,
        active: bool,
    ) -> StorageResult<()> {
        let key = contract_addr.as_bytes();

        let bytes = self.triggers.get(key)?.ok_or_else(|| {
            StorageError::NotFound(format!("No triggers found for contract {contract_addr}"))
        })?;

        let mut triggers: Vec<Trigger> = serde_json::from_slice(&bytes)
            .map_err(|e| format!("Failed to deserialize triggers: {}", e))?;

        let Some(trigger) = triggers.iter_mut().find(|t| t.id == trigger_id) else {
            return Err(StorageError::NotFound(format!(
                "Trigger {trigger_id} not found"
            )));
        };

        trigger.active = active;

        let encoded = serde_json::to_vec(&triggers)
            .map_err(|e| format!("Failed to serialize triggers: {}", e))?;
        self.triggers.insert(key, encoded)?;
        self.triggers.flush()?;
        Ok(())
    }

    /// Delete a specific trigger by ID.
    fn delete_trigger(&self, contract_addr: &str, trigger_id: &str) -> StorageResult<()> {
        let key = contract_addr.as_bytes();

        let bytes = self.triggers.get(key)?.ok_or_else(|| {
            StorageError::NotFound(format!("No triggers found for contract {contract_addr}"))
        })?;

        let mut triggers: Vec<Trigger> = serde_json::from_slice(&bytes)
            .map_err(|e| format!("Failed to deserialize triggers: {}", e))?;

        let len_before = triggers.len();
        triggers.retain(|t| t.id != trigger_id);

        if triggers.len() == len_before {
            return Err(StorageError::NotFound(format!(
                "Trigger {trigger_id} not found for {contract_addr}"
            )));
        }

        let encoded = serde_json::to_vec(&triggers)
            .map_err(|e| format!("Failed to serialize triggers: {}", e))?;
        self.triggers.insert(key, encoded)?;
        self.triggers.flush()?;
        Ok(())
    }

    /// List all triggers for a specific contract address.
    fn list_triggers(&self, contract_addr: &str) -> StorageResult<Vec<Trigger>> {
        let key = contract_addr.as_bytes();

        let Some(bytes) = self.triggers.get(key)? else {
            return Err(StorageError::NotFound(format!(
                "No triggers found for contract {contract_addr}"
            )));
        };

        let triggers: Vec<Trigger> = serde_json::from_slice(&bytes)
            .map_err(|e| StorageError::Other(e.to_string()))?;

        Ok(triggers)
    }
}