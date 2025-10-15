// Copyright (c) 2025, Algorealm Inc.

// This module contains all the important definitions that have are in a global namespace for Triggr.

#![allow(dead_code)]

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use std::{string::FromUtf8Error, sync::Arc, env::VarError, collections::HashMap};
use thiserror::Error;
use tokio::sync::broadcast::Receiver;

use crate::{chain::Blockchain, storage::Sled, util::CryptoError};


/// Errors from internal node operations.
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Sled error: {0}")]
    Sled(#[from] sled::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Other: {0}")]
    Other(String),
}

// Macro to implement conversion from other types (e.g String) into StorageError
macro_rules! impl_storage_error_from {
    ($($t:ty),*) => {
        $(
            impl From<$t> for StorageError {
                fn from(err: $t) -> Self {
                    StorageError::Other(err.to_string())
                }
            }
        )*
    };
}

// Make implementation
impl_storage_error_from!(
    String,
    &str,
    std::io::Error,
    FromUtf8Error,
    Box<bincode::ErrorKind>,
    VarError,
    CryptoError
);

/// Result type for storage operations.
pub type StorageResult<T> = Result<T, StorageError>;

/// Default path to database storage for projects info.
pub static DEFAULT_DB_PATH_PROJECTS: &str = "./.data/projects";

/// Default path to database storage for application data.
pub static DEFAULT_DB_PATH_APP: &str = "./.data/app";

/// Default path to database storage for application data.
pub static DEFAULT_DB_PATH_USERS: &str = "./.data/users";

/// The API key type
pub type ApiKey = String;

/// The entire state of the database system.
#[derive(Clone)]
pub struct Triggr {
    /// Storage will be done with Sled.
    pub store: Arc<Sled>,
    /// Supported chains
    pub chains: Arc<Blockchain>,
    /// High speed cache
    pub cache: Arc<HighSpeedCache>
}

impl Triggr {
    /// Initialize system state.
    pub fn new() -> Self {
        use dotenvy::dotenv;
        dotenv().ok(); // load from .env

        Self {
            store: Arc::new(Sled::new()),
            chains: Arc::new(Blockchain::default()),
            cache: Arc::new(HighSpeedCache::default())
        }
    }
}

/// High speed cache to retrieve important data quickly
#[derive(Default)]
pub struct HighSpeedCache {
    /// Contract hash -> Contract metadata address on disk
    pub contract: HashMap<String, String>
}

/// Trait for managing **documents** inside collections.
/// This abstracts how projects are persisted, making the storage
/// pluggable — e.g. we can back it with `Sled`, `MemoryStore`,
/// or even a database like Postgres in the future.
///
/// A document is a JSON-like object identified by a unique `id`.
#[async_trait]
pub trait DocumentStore {
    /// Return appropriate document key.
    fn key(project_id: &str, collection: &str, doc_id: &str) -> String;

    /// Insert a new document into the given collection.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project that owns the collection.
    /// * `collection` - The name of the target collection.
    /// * `doc` - The document to insert.
    ///
    /// # Returns
    /// * `Ok(())` if inserted successfully.
    /// * `Err` if insertion fails (e.g. collection not found).
    async fn insert(&self, project_id: &str, collection: &str, doc: Document) -> StorageResult<()>;

    /// Retrieve a document by its ID.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project that owns the collection.
    /// * `collection` - The name of the target collection.
    /// * `id` - The unique ID of the document.
    ///
    /// # Returns
    /// * `Ok(Some(Document))` if the document exists.
    /// * `Ok(None)` if the document does not exist.
    /// * `Err` if retrieval fails.
    fn get(&self, project_id: &str, collection: &str, id: &str) -> StorageResult<Option<Document>>;

    /// Update an existing document in a collection.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project that owns the collection.
    /// * `collection` - The name of the target collection.
    /// * `doc` - The updated document (must have the same `id` as the existing document).
    ///
    /// # Returns
    /// * `Ok(())` if the update succeeds.
    /// * `Err` if the document does not exist or the update fails.
    async fn update(&self, project_id: &str, collection: &str, doc: Document) -> StorageResult<()>;

    /// Delete a document from a collection by ID.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project that owns the collection.
    /// * `collection` - The name of the target collection.
    /// * `id` - The unique ID of the document to delete.
    ///
    /// # Returns
    /// * `Ok(())` if the document was found and deleted successfully.
    /// * `Err` if deletion fails.
    async fn delete(&self, project_id: &str, collection: &str, id: &str) -> StorageResult<()>;

    /// List all documents inside a given collection.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project that owns the collection.
    /// * `collection` - The name of the target collection.
    ///
    /// # Returns
    /// * `Ok(Vec<Document>)` containing all documents in the collection.
    /// * `Err` if the operation fails.
    fn list(&self, project_id: &str, collection: &str) -> StorageResult<Vec<Document>>;

    /// List all collections that belong to a given project.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project whose collections to retrieve.
    ///
    /// # Returns
    /// * `Ok(Vec<String>)` containing all collections for the project.
    /// * `Err` if the operation fails (e.g. database error).
    fn list_collections(&self, project_id: &str) -> StorageResult<Vec<String>>;

    /// Check if a collection already exists for a project.
    ///
    /// # Arguments
    /// * `project_id` - The ID of the project that owns the collection.
    /// * `name` - The collection name to check.
    ///
    /// # Returns
    /// * `Ok(true)` if the collection exists.
    /// * `Ok(false)` if it does not.
    /// * `Err` if the existence check fails.
    fn collection_exists(&self, project_id: &str, name: &str) -> StorageResult<bool>;
}

/// Metadata describing a document's lifecycle and versioning.
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct DocMetadata {
    /// When the document was created.
    pub created_at: u64,
    /// Last time the document was updated.
    pub updated_at: u64,
    /// Optional version number for optimistic concurrency control.
    pub version: Option<u64>,
    /// Arbitrary tags for filtering/grouping (e.g. ["draft", "archived"]).
    pub tags: Vec<String>,
}

/// A single JSON-like document stored inside a collection.
#[derive(Clone, Debug, Serialize, Deserialize, Default, ToSchema)]
pub struct Document {
    /// The unique document ID within its collection.
    pub id: String,
    /// The actual JSON payload of the document.
    pub data: Value,
    /// Optional metadata (timestamps, versioning, etc).
    pub metadata: Option<DocMetadata>,
}

/// JSON structure to return to subscribed clients
#[derive(Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct WsPayload {
    /// Type of operation performed
    pub op: String,
    /// Broadcast topic
    pub topic: String,
    /// Document affected (old copy on delete)
    pub doc: Document,
}

/// Represents a database project on the network.
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct Project {
    /// Project id
    pub id: String,
    /// Encrypted api key
    pub api_key: String,
    /// Project owners id
    pub owner: String,
    // The address of the contracts node. (PassetHub for now)
    // pub contracts_node_address: String,
    /// Description
    pub description: String,
    /// Location of contract metadata
    pub contract_file_path: String,
}

/// The `Subscribe` trait defines a real-time update mechanism for collections and documents.
///
/// Any storage backend implementing this trait should be able to:
/// - Maintain a list of subscribers (e.g., connected WebSocket clients),
/// - Broadcast updates when a document or collection changes.
///
/// This enables real-time synchronization across clients.
#[async_trait]
pub trait Subscribe {
    /// Publish an update to all subscribers of a topic.
    async fn publish(&self, collection: &str, doc_id: &str, mut json: WsPayload);

    /// Subscribe to a topic (e.g. a document or collection).
    async fn subscribe(&self, topic: &str) -> Receiver<String>;

    /// Unsubscribe from a topic.
    async fn unsubscribe(&self, _topic: &str) {}
}

/// Trait defining the behavior of a project store.
///
/// This abstracts how projects are persisted, making the storage
/// pluggable — e.g. we can back it with `Sled`, `MemoryStore`,
/// or even a database like Postgres in the future.
pub trait ProjectStore: Send + Sync {
    /// Create a new peoject and return its API key.
    fn create(&self, project: Project) -> StorageResult<ApiKey>;

    /// Fetch a project by its API key.
    fn get(&self, api_key: &str) -> StorageResult<Option<Project>>;

    /// Delete a project by its API key and owner.
    fn delete(&self, api_key: &str, owner: &str) -> StorageResult<()>;

    /// Get all projects owned by a user.
    fn get_user_projects(&self, user_id: &str) -> StorageResult<Vec<Project>>;
}
