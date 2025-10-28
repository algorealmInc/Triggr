// Copyright (c) 2025, Algorealm Inc.

// Module containing handlers to handle trigger requests.
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use utoipa::ToSchema;

use crate::{dsl::DslParser, server::middleware::RefProject};
use super::{*, db::AppError};

/// Struct modelling trigger creation
#[derive(Serialize, Deserialize, ToSchema)]
pub struct StoreTrigger {
    pub id: String,
    pub contract_addr: String,
    pub description: String,
    pub trigger: String,
}

/// Create and store a new trigger under a contract.
#[utoipa::path(
    post,
    path = "/api/trigger",
    request_body(content = inline(StoreTrigger), description = "Trigger creation payload"),
    responses(
        (status = 201, description = "Trigger saved successfully", body = inline(SlimTrigger)),
        (status = 400, description = "Invalid DSL or malformed request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn save_trigger(
    ref_project: RefProject,
    State(triggr): State<Triggr>,
    Json(data): Json<StoreTrigger>,
) -> Result<impl IntoResponse, AppError> {
    // Parse DSL into internal structure
    match DslParser::parse_script(&data.trigger) {
        Ok(script) => {
            // Construct trigger
            let trigger = Trigger {
                id: data.id.clone(),
                dsl: data.trigger.clone(),
                project_id: ref_project.project.id,
                description: data.description.clone(),
                rules: script.rules,
                active: true,
                created: Utc::now().timestamp_millis() as u64,
                last_run: 0,
            };

            triggr
                .store
                .store_trigger(&data.contract_addr, trigger.clone())
                .map_err(AppError::from)?;

            // Prepare SlimTrigger for response
            let slim = SlimTrigger {
                id: trigger.id,
                dsl: trigger.dsl,
                description: trigger.description,
                active: trigger.active,
                created: trigger.created,
                last_run: trigger.last_run,
            };

            Ok((
                StatusCode::CREATED,
                Json(json!({ "data": slim }))
            ))
        }
        Err(err) => Err(AppError::Internal(err)),
    }
}

/// List all triggers for a contract.
#[utoipa::path(
    get,
    path = "/api/trigger/{contract_addr}",
    params(
        ("contract_addr" = String, Path, description = "Address of the contract")
    ),
    responses(
        (status = 200, description = "List of triggers", body = Vec<SlimTrigger>),
        (status = 404, description = "Contract not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_triggers(
    State(triggr): State<Triggr>,
    Path(contract_addr): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let triggers = triggr
        .store
        .list_triggers(&contract_addr)
        .map_err(AppError::from)?;

    let slim: Vec<SlimTrigger> = triggers
        .into_iter()
        .map(|t| SlimTrigger {
            id: t.id,
            description: t.description,
            dsl: t.dsl,
            active: t.active,
            created: t.created,
            last_run: t.last_run,
        })
        .collect();

    Ok(Json(json!({ "data": slim })))
}

/// Get a single trigger by contract address and ID.
#[utoipa::path(
    get,
    path = "/api/trigger/{contract_addr}/{id}",
    params(
        ("contract_addr" = String, Path, description = "Contract address"),
        ("id" = String, Path, description = "Trigger ID")
    ),
    responses(
        (status = 200, description = "Trigger details", body = SlimTrigger),
        (status = 404, description = "Trigger not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_trigger(
    State(triggr): State<Triggr>,
    Path((contract_addr, id)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let trigger = triggr
        .store
        .get_trigger(&contract_addr, &id)
        .map_err(AppError::from)?;

    let slim = SlimTrigger {
        id: trigger.id,
        description: trigger.description,
        dsl: trigger.dsl,
        active: trigger.active,
        created: trigger.created,
        last_run: trigger.last_run,
    };

    Ok(Json(json!({ "data": slim })))
}

/// Update (activate/deactivate) a trigger.
#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateState {
    pub active: bool,
}

#[utoipa::path(
    put,
    path = "/api/trigger/{contract_addr}/{id}/state",
    request_body(content = inline(UpdateState)),
    params(
        ("contract_addr" = String, Path),
        ("id" = String, Path)
    ),
    responses(
        (status = 200, description = "Trigger state updated"),
        (status = 404, description = "Trigger not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_trigger_state(
    State(triggr): State<Triggr>,
    Path((contract_addr, id)): Path<(String, String)>,
    Json(payload): Json<UpdateState>,
) -> Result<impl IntoResponse, AppError> {
    triggr
        .store
        .set_trigger_state(&contract_addr, &id, payload.active)
        .map_err(AppError::from)?;

    Ok(Json(json!({ "data": { "updated": true } })))
}

/// Delete a trigger by ID.
#[utoipa::path(
    delete,
    path = "/api/trigger/{contract_addr}/{id}",
    params(
        ("contract_addr" = String, Path),
        ("id" = String, Path)
    ),
    responses(
        (status = 200, description = "Trigger deleted"),
        (status = 404, description = "Trigger not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_trigger(
    State(triggr): State<Triggr>,
    Path((contract_addr, id)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    triggr
        .store
        .delete_trigger(&contract_addr, &id)
        .map_err(AppError::from)?;

    Ok(Json(json!({ "data": { "deleted": true } })))
}
