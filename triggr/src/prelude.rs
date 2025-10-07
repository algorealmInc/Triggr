// Copyright (c) 2025, Algorealm Inc.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::broadcast::Receiver;
use std::{string::FromUtf8Error, sync::Arc};
use thiserror::Error;

use crate::{chain::Blockchain, storage::SledStore};
use utoipa::ToSchema;

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
    Box<bincode::ErrorKind>
);

/// Result type for storage operations.
pub type StorageResult<T> = Result<T, StorageError>;

/// Default path to database storage for projects info.
pub static DEFAULT_DB_PATH_PROJECTS: &str = "./.data/projects";

/// Default path to database storage for application data.
pub static DEFAULT_DB_PATH_APP: &str = "./.data/app";

/// Default path to database storage for application data.
pub static DEFAULT_DB_PATH_USERS: &str = "./.data/users";

/// The entire state of the database system.
#[derive(Clone)]
pub struct Samaritan {
    /// Storage will be done with Sled.
    pub store: Arc<SledStore>,
    /// Supported chains
    pub chains: Arc<Blockchain>,
}

/// Trait for managing **documents** inside collections.
/// We are using a trait here to decouple the storage layer and make it easily upgradeable and replaceable.
///
/// A document is a JSON-like object identified by a unique `id`.
/// Trait for managing **documents** inside collections.
#[async_trait]
pub trait DocumentStorage<T>: Subscribe<T> + Send + Sync
where
    T: Clone + Send + Sync + 'static,
{
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
    async fn insert(
        &self,
        project_id: &str,
        collection: &str,
        doc: Document,
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
    async fn update(
        &self,
        project_id: &str,
        collection: &str,
        doc: Document,
    ) -> StorageResult<()>;

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
    async fn delete(
        &self,
        project_id: &str,
        collection: &str,
        id: &str,
    ) -> StorageResult<()>;

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
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct Document {
    /// The unique document ID within its collection.
    pub id: String,
    /// The actual JSON payload of the document.
    pub data: Value,
    /// Optional metadata (timestamps, versioning, etc).
    pub metadata: Option<DocMetadata>,
}

/// JSON structure to return to subscribed clients
#[derive(Clone, Default, Serialize, Deserialize)]
pub struct WsPayload {
    /// Type of operation performed
    pub op: String,
    /// Broadcast topic
    pub topic: String,
    /// Document affected (old copy on delete)
    pub doc: Document,
}

/// The `Subscribe` trait defines a real-time update mechanism for collections and documents.
///
/// Any storage backend implementing this trait should be able to:
/// - Maintain a list of subscribers (e.g., connected WebSocket clients),
/// - Broadcast updates when a document or collection changes.
///
/// This enables real-time synchronization across clients.
#[async_trait]
pub trait Subscribe<T: Clone + Send + Sync + 'static> {
    /// Publish an update to all subscribers of a topic.
    async fn publish(&self, collection: &str, doc_id: &str, mut json: WsPayload);

    /// Subscribe to a topic (e.g. a document or collection).
    async fn subscribe(&self, topic: &str) -> Receiver<T>;

    /// Unsubscribe from a topic.
    async fn unsubscribe(&self, topic: &str);
}
