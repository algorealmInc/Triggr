// Copyright (c) 2025, Algorealm Inc.

// This module contains all the important definitions that are in the global namespace for Triggr.

#![allow(dead_code)]

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, env::VarError, string::FromUtf8Error, sync::Arc};
use thiserror::Error;
use tokio::sync::RwLock;
use utoipa::ToSchema;

use crate::{
    chain::{
        polkadot::util::{ContractMetadata, SimplifiedEvent},
        Blockchain,
    },
    dsl::Rule,
    storage::{CollectionSummary, Sled},
    util::CryptoError,
};

/// Errors from internal database operations.
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

// Macro to implement conversion from other types (e.g String) into StorageError.
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

// Implementations
impl_storage_error_from!(
    String,
    &str,
    std::io::Error,
    FromUtf8Error,
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

/// Default path to database storage for contract metadata addresses.
pub static DEFAULT_DB_PATH_METADATA: &str = "./.data/metadata";

/// Default path to database storage for triggers.
pub static DEFAULT_TRIGGER_PATH_METADATA: &str = "./.data/triggers";

/// Contracts file directory.
pub const CONTRACTS_DIR: &str = "./.data/contracts";

/// The API key type.
pub type ApiKey = String;

/// The entire state of the database system.
#[derive(Clone)]
pub struct Triggr {
    /// Storage will be done with Sled.
    pub store: Arc<Sled>,
    /// Supported chains
    pub chains: Arc<Blockchain>,
    /// High speed cache
    pub cache: Arc<RwLock<HighSpeedCache>>,
}

impl Triggr {
    /// Initialize system state.
    pub fn new() -> Self {
        let triggr = Self {
            store: Arc::new(Sled::new()),
            chains: Arc::new(Blockchain::default()),
            cache: Arc::new(RwLock::new(HighSpeedCache::default())),
        };

        // Load metadata into cache
        let mut cache = HighSpeedCache::default();
        cache.init_contract_metadata(triggr.store.clone());

        Triggr {
            cache: Arc::new(RwLock::new(cache)),
            ..triggr
        }
    }
}

/// High speed cache to retrieve important data quickly.
#[derive(Default)]
pub struct HighSpeedCache {
    /// Contract hash -> Contract metadata
    pub contract: HashMap<String, ContractMetadata>,
}

impl HighSpeedCache {
    /// Load contract metadata into cache.
    pub fn init_contract_metadata(&mut self, store: Arc<Sled>) {
        // Get metadata entries
        if let Ok(meta_entries) = store.get_metadata_entries() {
            for meta in meta_entries {
                if let Ok(metadata) = self.load_n_serialize(&meta.path) {
                    self.save_metadata(meta.addr, metadata);
                }
            }
        }
    }

    /// Helper function to load and serialize metadata.
    pub fn load_n_serialize(&mut self, path: &str) -> StorageResult<ContractMetadata> {
        // Read metadata content
        let metadata_json = std::fs::read_to_string(path)?;

        // Return metadata
        Ok(serde_json::from_str::<ContractMetadata>(&metadata_json)?)
    }

    /// Save contract address and metadata.
    pub fn save_metadata(&mut self, addr: String, data: ContractMetadata) {
        self.contract.insert(addr.to_lowercase(), data);
    }

    /// Return inner cache structure.
    pub fn into_inner(&self) -> HashMap<String, ContractMetadata> {
        self.contract.clone()
    }
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
    /// * `update` - Whether it's an update or a direct insert.
    ///
    /// # Returns
    /// * `Ok(())` if inserted successfully.
    /// * `Err` if insertion fails (e.g. collection not found).
    async fn insert(
        &self,
        project_id: &str,
        collection: &str,
        doc: Document,
        update: bool,
    ) -> StorageResult<()>;

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
    /// * `Ok(Vec<CollectionSummary>)` containing all collections and its info for the project.
    /// * `Err` if the operation fails (e.g. database error).
    fn list_collections(&self, project_id: &str) -> StorageResult<Vec<CollectionSummary>>;

    /// Helper to return stats for a single collection
    fn collection_stats(&self, project_id: &str, collection: &str) -> StorageResult<(usize, u64)>;

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
#[derive(Clone, Debug, Default, Serialize, Deserialize, ToSchema)]
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
    pub metadata: DocMetadata,
}

/// Response payload for subscribed clients.
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
    /// The address of the contracts onchain.
    pub contract_address: String,
    /// Description
    pub description: String,
    /// Location of contract metadata
    pub contract_file_path: String,
    /// Events emmitted by contract
    pub contract_events: Vec<SimplifiedEvent>,
}

/// Trait defining the behavior of a project store.
///
/// This abstracts how projects are persisted, making the storage
/// pluggable — e.g. we can back it with `Sled`, `MemoryStore`,
/// or even a database like Postgres in the future.
pub trait ProjectStore: Send + Sync {
    /// Create a new project
    fn create(&self, project: &mut Project) -> StorageResult<()>;

    /// Fetch a project by its API key.
    fn get(&self, api_key: &str) -> StorageResult<Option<Project>>;

    /// Delete a project by its API key and owner.
    fn delete(&self, api_key: &str, owner: &str) -> StorageResult<()>;

    /// Get all projects owned by a user.
    fn get_user_projects(&self, user_id: &str) -> StorageResult<Vec<Project>>;
}

/// Struct that describes a trigger.
#[derive(Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub id: String,
    pub description: String,
    /// Project Id the trigger belongs to
    pub project_id: String,
    /// Raw trigger dsl
    pub dsl: String,
    /// Trigger rules to execute
    pub rules: Vec<Rule>,
    /// Flag to indicate state
    pub active: bool,
    /// Deploy timestamp
    pub created: u64,
    /// Last time trigger was run
    pub last_run: u64,
}

/// Streamlined trigger to return as payload.
#[derive(Clone, Serialize, Deserialize, ToSchema)]
pub struct SlimTrigger {
    pub id: String,
    pub description: String,
    /// Raw trigger dsl
    pub dsl: String,
    /// Flag to indicate state
    pub active: bool,
    /// Deploy timestamp
    pub created: u64,
    /// Last time trigger was run
    pub last_run: u64,
}

/// Trait to handle trigger operations internally.
pub trait TriggerStore {
    /// Store trigger.
    fn store_trigger(&self, contract_addr: &str, trigger: Trigger) -> StorageResult<()>;

    /// Return trigger.
    fn get_trigger(&self, contract_addr: &str, name: &str) -> StorageResult<Trigger>;

    /// Change trigger state.
    fn set_trigger_state(
        &self,
        contract_addr: &str,
        trigger_id: &str,
        active: bool,
    ) -> StorageResult<()>;

    /// Delete trigger.
    fn delete_trigger(&self, contract_addr: &str, trigger_id: &str) -> StorageResult<()>;

    /// List all triggers for a contract.
    fn list_triggers(&self, contract_addr: &str) -> StorageResult<Vec<Trigger>>;
}
