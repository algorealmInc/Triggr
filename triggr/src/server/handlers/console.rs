// Copyright (c) 2025, Algorealm Inc.

// Module containing handlers for console (front-end) requests.

use crate::chain::polkadot::util::SimplifiedEvent;
use crate::{chain::polkadot::util::simplify_events, server::middleware::Auth, util::decrypt};
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use serde_json::{json, Value};
use std::{env, path::PathBuf};
use tokio::io::AsyncWriteExt;
use utoipa::ToSchema;

use super::{
    db::{AppError, OptionExt},
    *,
};

/// Max uploadable file size
const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB

#[derive(Serialize, ToSchema)]
pub struct CreateProjectResponse {
    pub message: String,
    pub project: Project,
    pub secret: ApiKey
}

/// Request schema for Swagger (multipart form)
#[derive(ToSchema)]
pub struct ProjectCreateForm {
    pub project_name: String,
    pub description: String,
    pub contract_addr: String,
    #[schema(value_type = String, format = Binary)]
    pub contracts_json: Vec<u8>,
}

// Console login endpoint
#[utoipa::path(
    post,
    path = "/api/console/login",
    responses(
        (status = 200, description = "User successfully authenticated"),
        (status = 401, description = "Invalid or missing credentials")
    )
)]
pub async fn login(State(_triggr): State<Triggr>, auth: Auth) -> impl IntoResponse {
    // Return decoded user details
    (StatusCode::OK, Json(json!({ "user": auth.claims })))
}

/// Create a new project.
#[utoipa::path(
    post,
    path = "/api/console/project",
    request_body(
        content = ProjectCreateForm,
        content_type = "multipart/form-data",
        description = "Project creation form with contracts.json upload"
    ),
    responses(
        (status = 201, description = "Project created successfully", body = inline(CreateProjectResponse)),
        (status = 401, description = "Unauthorized"),
        (status = 400, description = "Invalid input"),
        (status = 413, description = "File too large"),
        (status = 500, description = "Internal server error"),
    ),
)]
pub async fn create_project(
    State(triggr): State<Triggr>,
    auth: Auth,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<CreateProjectResponse>), AppError> {
    let mut project_name: Option<String> = None;
    let mut description: Option<String> = None;
    let mut contract_addr: Option<String> = None;
    let mut contract_file_path: Option<PathBuf> = None;

    // Ensure contracts directory exists
    tokio::fs::create_dir_all(CONTRACTS_DIR)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to create contracts directory: {}", e)))?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to parse multipart: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "project_name" => {
                let text = field
                    .text()
                    .await
                    .map_err(|e| AppError::BadRequest(format!("Invalid project_name: {}", e)))?;

                // Validate project name
                if text.trim().is_empty() {
                    return Err(AppError::BadRequest(
                        "Project name cannot be empty".to_string(),
                    ));
                }

                project_name = Some(text.trim().to_string());
            }
            "description" => {
                description = Some(
                    field
                        .text()
                        .await
                        .unwrap_or_else(|_| String::new())
                        .trim()
                        .to_string(),
                );
            }
            "contract_addr" => {
                let hash = field.text().await.unwrap_or_else(|_| String::new());

                // Validate hash format (alphanumeric only)
                if !hash.chars().all(|c| c.is_alphanumeric()) {
                    return Err(AppError::BadRequest(
                        "Invalid contract hash format".to_string(),
                    ));
                }

                contract_addr = Some(hash.to_lowercase());
            }
            "contracts_json" => {
                // Ensure we have contract_addr before processing file
                let hash = contract_addr.as_ref().ok_or_else(|| {
                    AppError::BadRequest(
                        "contract_addr must be provided before contracts_json".to_string(),
                    )
                })?;

                // Read file data with size limit
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| AppError::BadRequest(format!("Invalid file data: {}", e)))?;

                // Check file size
                if data.len() > MAX_FILE_SIZE {
                    return Err(AppError::BadRequest(format!(
                        "File too large. Max size: {} bytes",
                        MAX_FILE_SIZE
                    )));
                }

                // Validate JSON
                serde_json::from_slice::<serde_json::Value>(&data)
                    .map_err(|e| AppError::BadRequest(format!("Invalid JSON file: {}", e)))?;

                // Create safe file path
                let filename = format!("{}.json", hash);
                let path = PathBuf::from(CONTRACTS_DIR).join(&filename);

                // Write file
                let mut file = tokio::fs::File::create(&path)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to create file: {}", e)))?;

                file.write_all(&data)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to write file: {}", e)))?;

                file.flush()
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to flush file: {}", e)))?;

                contract_file_path = Some(path);
            }
            _ => {
                // Log unexpected fields but don't fail
                #[cfg(feature = "tracing")]
                tracing::debug!("Unexpected field in multipart: {}", name);
            }
        }
    }

    // Validate required fields
    let project_name =
        project_name.ok_or_else(|| AppError::BadRequest("Missing project_name".to_string()))?;

    let description =
        description.ok_or_else(|| AppError::BadRequest("Missing description".to_string()))?;

    let contract_addr =
        contract_addr.ok_or_else(|| AppError::BadRequest("Missing contract_addr".to_string()))?;

    let contract_path = contract_file_path
        .ok_or_else(|| AppError::BadRequest("Missing contracts_json file".to_string()))?;

    let contract_file_path = contract_path.display().to_string();

    // Contract events
    let mut events = Vec::new();

    // Save metadata info to database
    triggr
        .store
        .store_metadata_entry(&contract_addr, &contract_file_path)?;

    // Add metadata content to high speed cache
    if let Some(path_str) = contract_path.to_str() {
        // Acquire cache lock
        let mut cache = triggr.cache.write().await;
        if let Ok(metadata) = cache.load_n_serialize(path_str) {
            // Extract events
            events = simplify_events(&metadata);

            // Save to high speed cache
            cache.save_metadata(contract_addr.clone(), metadata);
        }
    }

    // Construct project
    let mut project = Project {
        id: project_name.clone(),
        api_key: String::with_capacity(88),
        owner: auth.claims.user_id.clone(),
        description: description.clone(),
        contract_address: contract_addr,
        contract_file_path: contract_file_path.clone(),
        contract_events: events.clone()
    };

    // Save to database
    let secret = match triggr.store.create(&mut project) {
        Ok(key) => key,
        Err(e) => {
            // Clean up uploaded file on database error
            if let Err(_cleanup_err) = tokio::fs::remove_file(&contract_path).await {
                #[cfg(feature = "tracing")]
                tracing::error!("Failed to cleanup file after DB error: {}", _cleanup_err);
            }

            return Err(AppError::Internal(format!(
                "Failed to create project: {}",
                e
            )));
        }
    };

    // Return success response
    let response = CreateProjectResponse {
        message: "Project created successfully".to_string(),
        project,
        secret
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Delete a project
#[utoipa::path(
    delete,
    path = "/api/console/project/{api_key}",
    params(
        ("api_key" = String, Path, description = "Project Api Key"),
    ),
    responses(
        (status = 200, description = "Project deleted successfully"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_project(
    State(triggr): State<Triggr>,
    Path(api_key): Path<String>,
    auth: Auth,
) -> Result<impl IntoResponse, AppError> {
    // Get API Key from public cypher id
    let encryption_key = env::var("TRIGGR_ENCRYPTION_KEY")
        .or_else(|_| Err(AppError::Internal("Encryption key not set in env.".into())))?;
    let decrypted_key = &decrypt(&api_key, &encryption_key)
        .or_else(|_| Err(AppError::Internal("Decryption failed".into())))?;

    // Use auth id to delete project
    let _ = ProjectStore::delete(&*triggr.store, &decrypted_key, &auth.claims.user_id)?;

    Ok(Json(json!({
        "message": "Project deleted successfully."
    })))
}

/// Return a project
#[utoipa::path(
    get,
    path = "/api/console/project/{api_key}",
    params(
        ("api_key" = String, Path, description = "Project Api Key"),
    ),
    responses(
        (status = 200, description = "Project returned successfully"),
        (status = 404, description = "Project not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_project(
    State(triggr): State<Triggr>,
    Path(api_key): Path<String>,
    _auth: Auth,
) -> Result<impl IntoResponse, AppError> {
    // Get API Key from public cypher id
    let encryption_key = env::var("TRIGGR_ENCRYPTION_KEY")
        .or_else(|_| Err(AppError::Internal("Encryption key not set in env.".into())))?;
    let decrypted_key = &decrypt(&api_key, &encryption_key)
        .or_else(|_| Err(AppError::Internal("Decryption failed".into())))?;

    // Fetch and return projects
    let project =
        ProjectStore::get(&*triggr.store, &decrypted_key)?.or_not_found("Project not found")?;

    Ok(Json(json!({
        "project": project
    })))
}

/// List all projects belonging to a specific user.
/// Fetches all projects associated with the given `user_id`.
#[utoipa::path(
    get,
    path = "/api/console/projects",
    responses(
        (status = 200, description = "List of projects retrieved successfully", body = [Project]),
        (status = 404, description = "User not found"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_projects(
    State(triggr): State<Triggr>,
    auth: Auth,
) -> Result<Json<Value>, (StatusCode, String)> {
    match ProjectStore::get_user_projects(&*triggr.store, &auth.claims.user_id) {
        Ok(projects) => Ok(Json(json!({
            "data": projects }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to list projects: {}", e),
        )),
    }
}
