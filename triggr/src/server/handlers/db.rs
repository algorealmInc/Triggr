// Copyright (c) 2025, Algorealm Inc.

// This module contains HTTP(S) route handlers to perform internal database operations.

use crate::{
    prelude::{Document, DocumentStore, StorageError, Triggr},
    server::middleware::RefProject,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// Generic error returned from internal database operations.
#[derive(Debug)]
pub enum AppError {
    /// Not Found
    NotFound(String),
    /// Bad request
    BadRequest(String),
    /// Internal server error
    Internal(String),
}

// Implement conversion from generic StorageError to AppError.
impl From<StorageError> for AppError {
    fn from(err: StorageError) -> Self {
        match err {
            StorageError::NotFound(msg) => AppError::NotFound(msg),
            StorageError::Sled(e) => AppError::Internal(e.to_string()),
            StorageError::Serde(e) => AppError::BadRequest(e.to_string()),
            StorageError::Other(msg) => AppError::Internal(msg),
        }
    }
}

// Implement IntoResponse for AppError.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

/// Helper trait so `None` automatically becomes `AppError::NotFound`.
pub trait OptionExt<T> {
    fn or_not_found(self, msg: &str) -> Result<T, AppError>;
}

// Implement it for Option<T>.
impl<T> OptionExt<T> for Option<T> {
    fn or_not_found(self, msg: &str) -> Result<T, AppError> {
        self.ok_or_else(|| AppError::NotFound(msg.into()))
    }
}

/// List all collections for a project
#[utoipa::path(
    get,
    path = "/api/db/collections",
    responses(
        (status = 200, description = "List of collections for the project", body = [String]),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_collections(
    State(triggr): State<Triggr>,
    ref_project: RefProject,
) -> Result<impl IntoResponse, AppError> {
    let cols = triggr.store.list_collections(&ref_project.project.id)?;
    Ok((
        StatusCode::OK,
        Json(json!({
            "data": cols
        })),
    ))
}

/// Insert a new document
#[utoipa::path(
    post,
    path = "/api/db/collections/{name}/docs",
    request_body = inline(Document),
    params(
        ("name" = String, Path, description = "Collection name")
    ),
    responses(
        (status = 201, description = "Document inserted successfully", body = inline(serde_json::Value)),
        (status = 400, description = "Invalid document or malformed request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn insert_document(
    ref_project: RefProject,
    State(triggr): State<Triggr>,
    Path(name): Path<String>,
    Json(doc): Json<Document>,
) -> Result<impl IntoResponse, AppError> {
    DocumentStore::insert(&*triggr.store, &ref_project.project.id, &name, doc).await?;
    Ok((StatusCode::CREATED, Json(json!({ "ok": true }))))
}

/// List all documents in a collection
#[utoipa::path(
    get,
    path = "/api/db/collections/{name}/docs",
    params(
        ("name" = String, Path, description = "Collection name")
    ),
    responses(
        (status = 200, description = "List of documents in the collection", body = [Document]),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_documents(
    State(triggr): State<Triggr>,
    Path(name): Path<String>,
    ref_project: RefProject,
) -> Result<impl IntoResponse, AppError> {
    let docs = triggr.store.list(&ref_project.project.id, &name)?;
    Ok((StatusCode::OK, Json(docs)))
}

/// Get a document by ID
#[utoipa::path(
    get,
    path = "/api/db/collections/{name}/docs/{id}",
    params(
        ("name" = String, Path, description = "Collection name"),
        ("id" = String, Path, description = "Document ID")
    ),
    responses(
        (status = 200, description = "Document retrieved successfully", body = Document),
        (status = 404, description = "Document not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_document(
    State(triggr): State<Triggr>,
    Path((name, id)): Path<(String, String)>,
    ref_project: RefProject,
) -> Result<impl IntoResponse, AppError> {
    let doc = triggr
        .store
        .get(&ref_project.project.id, &name, &id)?
        .or_not_found("Document {id} not found")?;
    Ok((StatusCode::OK, Json(doc)))
}

/// Update a document
#[utoipa::path(
    put,
    path = "/api/db/collections/{name}/docs/{id}",
    request_body = inline(Document),
    params(
        ("name" = String, Path, description = "Collection name"),
        ("id" = String, Path, description = "Document ID")
    ),
    responses(
        (status = 200, description = "Document updated successfully", body = inline(serde_json::Value)),
        (status = 400, description = "Invalid document or malformed request"),
        (status = 404, description = "Document not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_document(
    ref_project: RefProject,
    State(triggr): State<Triggr>,
    Path((name, _)): Path<(String, String)>,
    Json(doc): Json<Document>,
) -> Result<impl IntoResponse, AppError> {
    triggr
        .store
        .update(&ref_project.project.id, &name, doc)
        .await?;
    Ok((StatusCode::OK, Json(json!({ "ok": true }))))
}

/// Delete a document
#[utoipa::path(
    delete,
    path = "/api/db/collections/{name}/docs/{id}",
    params(
        ("name" = String, Path, description = "Collection name"),
        ("id" = String, Path, description = "Document ID")
    ),
    responses(
        (status = 204, description = "Document deleted successfully"),
        (status = 404, description = "Document not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_document(
    State(triggr): State<Triggr>,
    Path((name, id)): Path<(String, String)>,
    ref_project: RefProject,
) -> Result<impl IntoResponse, AppError> {
    triggr
        .store
        .delete(&ref_project.project.id, &name, &id)
        .await?;
    Ok((StatusCode::OK, Json(json!({ "ok": true }))))
}
