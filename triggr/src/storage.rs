// Copyright (c) 2025, Algorealm Inc.

// This module handles all internal storage operations for Triggr.
// We are using sled for the internal database storage. This is because it is fast and composable in a single binary.
// No external (network) dependencies.

use crate::util::encrypt;

use super::*;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sled::{Db, IVec};
use std::{collections::HashMap, env, fs, path::Path, sync::Arc};
use tokio::sync::{
    broadcast::{self, Receiver, Sender},
    RwLock,
};

/// Metadata database entry
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Metadata {
    pub hash: String,
    pub path: String,
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

// Implement `Subscribe` for DbSubscription
#[async_trait]
impl Subscribe for DbSubscriptions {
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

        // Open or create storage directory
        fs::create_dir_all(&projects_path).expect(&format!("Failed to create {}", projects_path));
        fs::create_dir_all(&app_path).expect(&format!("Failed to create {}", app_path));
        fs::create_dir_all(&users_path).expect(&format!("Failed to create {}", users_path));
        fs::create_dir_all(&meta_path).expect(&format!("Failed to create {}", meta_path));

        // Initialize database
        let projects_db =
            ::sled::open(Path::new(&projects_path)).expect("Failed to open sled database");
        let app_db = ::sled::open(Path::new(&app_path)).expect("Failed to open sled database");
        let users_db = ::sled::open(Path::new(&users_path)).expect("Failed to open sled database");
        let meta_db = ::sled::open(Path::new(&meta_path)).expect("Failed to open sled database");

        Self {
            projects: Arc::new(projects_db),
            app: Arc::new(app_db),
            users: Arc::new(users_db),
            metadata: Arc::new(meta_db),
            subscriptions: DbSubscriptions::default(),
        }
    }

    /// Helper function that receives a user ID and stores the API keys
    /// of projects associated with it.
    pub fn add_user_project(&self, user_id: &str, project: Project) -> StorageResult<()> {
        let mut projects: Vec<Project> = if let Some(value) = self.users.get(user_id)? {
            bincode::deserialize(&value).map_err(|e| format!("Deserialization error: {e}"))?
        } else {
            Vec::new()
        };

        // Avoid duplicates by checking project.id
        if !projects.iter().any(|p| p.id == project.id) {
            projects.push(project);
        }

        let encoded =
            bincode::serialize(&projects).map_err(|e| format!("Serialization error: {e}"))?;
        self.users.insert(user_id, encoded)?;

        Ok(())
    }

    /// Helper function to store all metadata paths as a whole into the db.
    pub fn store_metadata_paths(&self, path: &str) -> StorageResult<()> {
        const KEY: &str = "HANNAH";

        // Fetch existing list
        let mut paths: Vec<String> = if let Some(bytes) = self.metadata.get(KEY)? {
            bincode::deserialize(&bytes).unwrap_or_default()
        } else {
            vec![]
        };

        // Add only if not already present
        if !paths.contains(&path.to_string()) {
            paths.push(path.to_string());
        }

        // Serialize and store updated list
        let bytes = bincode::serialize(&paths)
            .map_err(|e| format!("Failed to serialize metadata paths: {}", e))?;

        self.metadata.insert(KEY, bytes)?;
        self.metadata.flush()?; // ensure persistence

        Ok(())
    }

    pub fn get_metadata_paths(&self) -> StorageResult<Vec<String>> {
        const KEY: &str = "HANNAH";
        if let Some(bytes) = self.metadata.get(KEY)? {
            Ok(bincode::deserialize(&bytes).unwrap_or_default())
        } else {
            Ok(vec![])
        }
    }

    /// Store or update unique (hash, path) entries under a single key ("HANNAH")
    pub fn store_metadata_entry(&self, hash: &str, path: &str) -> StorageResult<()> {
        const KEY: &str = "HANNAH";

        // Fetch existing entries (or start with an empty vector)
        let mut entries: Vec<Metadata> = if let Some(bytes) = self.metadata.get(KEY)? {
            bincode::deserialize(&bytes).unwrap_or_default()
        } else {
            vec![]
        };

        // Check if an entry with the same hash already exists
        if !entries.iter().any(|e| e.hash == hash) {
            entries.push(Metadata {
                hash: hash.to_string(),
                path: path.to_string(),
            });
        }

        // Serialize updated entries
        let bytes = bincode::serialize(&entries)
            .map_err(|e| format!("Failed to serialize entries: {}", e))?;

        // Store and flush
        self.metadata.insert(KEY, bytes)?;
        self.metadata.flush()?; // persist immediately

        Ok(())
    }

    /// Retrieve all stored entries
    pub fn get_metadata_entries(&self) -> StorageResult<Vec<Metadata>> {
        const KEY: &str = "HANNAH";

        if let Some(bytes) = self.metadata.get(KEY)? {
            let entries: Vec<Metadata> = bincode::deserialize(&bytes)
                .map_err(|e| format!("Failed to deserialize entries: {}", e))?;
            Ok(entries)
        } else {
            Ok(vec![])
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
    async fn insert(&self, project_id: &str, collection: &str, doc: Document) -> StorageResult<()> {
        let key = <Sled as DocumentStore>::key(project_id, collection, &doc.id);
        let value = serde_json::to_vec(&doc)?;
        self.app.insert(key.as_bytes(), value)?;

        // Broadcast the insert event to all subscribed clients
        Subscribe::publish(
            &self.subscriptions,
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
        self.insert(project_id, collection, doc).await
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
                Subscribe::publish(
                    &self.subscriptions,
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

// Implement ProjectStore for Sled
impl ProjectStore for Sled {
    fn create(&self, project: &mut Project) -> StorageResult<()> {
        // Generate a random 32-character alphanumeric key.
        let key = util::generate_nonce::<32>();

        // Hash the API key to be used as project ID
        let encryption_key = env::var("TRIGGR_ENCRYPTION_KEY")?;
        let hashed_key = encrypt(&key, &encryption_key)?;

        // Update encrypted key
        project.api_key = hashed_key.clone();

        // Serialize the ApiKey for storage in sled
        let bytes = bincode::serialize(&project).map_err(|e| e.to_string())?;

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
