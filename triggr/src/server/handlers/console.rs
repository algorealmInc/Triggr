// Copyright (c) 2025, Algorealm Inc.

// Module containing

use crate::server::middleware::Auth;
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use serde_json::{json, Value};

use std::path::PathBuf;
use tokio::io::AsyncWriteExt;

use super::{db::AppError, *};

pub async fn login(State(_triggr): State<Triggr>, auth: Auth) -> impl IntoResponse {
    // Return decoded user details
    (StatusCode::OK, Json(json!({ "user": auth.claims })))
}

/// Request schema for Swagger (multipart form)
pub struct ProjectCreateForm {
    pub project_name: String,
    pub description: String,
    pub contract_hash: String,
    pub contracts_json: Vec<u8>,
}

#[derive(Serialize)]
pub struct CreateProjectResponse {
    pub message: String,
    pub api_key: String,
    pub project: Project,
}

/// Create a new project.
pub async fn create_project(
    State(triggr): State<Triggr>,
    auth: Auth,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<CreateProjectResponse>), (StatusCode, String)> {
    let mut project_name: Option<String> = None;
    let mut description: Option<String> = None;
    let mut contract_hash: Option<String> = None;
    let mut contract_file_path: Option<PathBuf> = None;

    while let Some(field) = multipart.next_field().await.map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Failed to parse multipart".to_string(),
        )
    })? {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "project_name" => {
                project_name =
                    Some(field.text().await.map_err(|_| {
                        (StatusCode::BAD_REQUEST, "Invalid project_name".to_string())
                    })?);
            }
            "description" => {
                description = Some(field.text().await.unwrap_or_else(|_| "".to_string()));
            }
            "contract_hash" => {
                contract_hash = Some(field.text().await.unwrap_or_else(|_| "".to_string()));
            }
            "contracts_json" => {
                // Save uploaded file to tmp/
                let path = PathBuf::from(&format!(
                    "/.contracts/{}.json",
                    contract_hash.clone().unwrap()
                ));
                let mut file = tokio::fs::File::create(&path).await.map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Could not save file".to_string(),
                    )
                })?;
                let data = field
                    .bytes()
                    .await
                    .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid file".to_string()))?;
                file.write_all(&data).await.map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Failed to write file".to_string(),
                    )
                })?;
                contract_file_path = Some(path);
            }
            _ => {}
        }
    }

    // Validate required fields
    let project_name =
        project_name.ok_or((StatusCode::BAD_REQUEST, "Missing project_name".to_string()))?;

    let description =
        description.ok_or((StatusCode::BAD_REQUEST, "Missing description".to_string()))?;

    let _ =
        contract_hash.ok_or((StatusCode::BAD_REQUEST, "Missing contract hash".to_string()))?;

    // Construct a project
    let project = Project {
        id: project_name.clone(),
        owner: auth.claims.user_id.clone(),
        description: description.clone(),
        contract_file_path: contract_file_path
            .map(|p| p.display().to_string())
            .unwrap_or_default(),
    };

    // Save to database
    let api_key = triggr.store.create(project.clone()).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("DB error: {}", e),
        )
    })?;

    // Response
    Ok((
        StatusCode::CREATED,
        Json(CreateProjectResponse {
            message: "Project created".to_string(),
            api_key,
            project,
        }),
    ))
}

/// Delete a project
pub async fn delete_project(
    State(triggr): State<Triggr>,
    Path(api_key): Path<String>,
    auth: Auth,
) -> Result<impl IntoResponse, AppError> {
    // Use id to delete project
    let _ = ProjectStore::delete(&*triggr.store, &api_key, &auth.claims.user_id)?;

    Ok(Json(json!({
        "message": "Project deleted successfully."
    })))
}

/// List all projects belonging to a specific user.
/// Fetches all projects associated with the given `user_id`.
pub async fn list_projects(
    State(triggr): State<Triggr>,
    auth: Auth,
) -> Result<Json<Vec<Project>>, (StatusCode, String)> {
    match ProjectStore::get_user_projects(&*triggr.store, &auth.claims.user_id) {
        Ok(projects) if !projects.is_empty() => Ok(Json(projects)),
        Ok(_) => Err((StatusCode::NOT_FOUND, "User not found".to_string())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to list projects: {}", e),
        )),
    }
}
