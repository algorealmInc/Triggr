// Copyright (c) 2025, Algorealm Inc.

// This module contains routes to handled and direact incoming http and ws requests.

use super::handlers::docs::ApiDoc;
use super::handlers::{console, db, trigger, ws};
use super::middleware as midw;
use super::*;
use axum::routing::{delete, get, put};
use axum::{middleware as mw, routing::post, Router};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

/// Returns routes to handle DB requests (documents only, collections implicit).
pub fn db_routes() -> Router<Triggr> {
    Router::new()
        .nest(
            "/api/db/collections",
            Router::new()
                .route("/", get(db::list_collections))
                .route(
                    "/{name}/docs",
                    post(db::insert_document).get(db::list_documents),
                )
                .route(
                    "/{name}/docs/{id}",
                    get(db::get_document)
                        .put(db::update_document)
                        .delete(db::delete_document),
                ),
        )
        .route_layer(mw::from_fn(midw::require_api_key))
}

/// Returns routes to handle console requests.
pub fn console_routes() -> Router<Triggr> {
    Router::new()
        .route("/api/console/login", 
        get(console::login))
        .route("/api/console/project", post(console::create_project))
        .route(
            "/api/console/project/{project_id}",
            get(console::get_project).delete(console::delete_project),
        )
        .route("/api/console/projects", get(console::list_projects))
}

/// Returns routes to handle console requests concerning triggers.
pub fn trigger_routes() -> Router<Triggr> {
    Router::new()
        .route("/api/trigger", post(trigger::save_trigger))
        .route("/api/trigger/{contract_addr}", get(trigger::list_triggers))
        .route(
            "/api/trigger/{contract_addr}/{id}",
            get(trigger::get_trigger).delete(trigger::delete_trigger),
        )
        .route(
            "/api/trigger/{contract_addr}/{id}/state",
            put(trigger::update_trigger_state),
        )
        .route_layer(mw::from_fn(midw::require_api_key))
}

/// Returns the 'ws' route.
pub fn ws_route() -> Router<Triggr> {
    Router::new()
        .route("/ws", get(ws::ws_handler))
        .route_layer(mw::from_fn(midw::require_api_key))
}

/// Return swagger docs route.
pub fn docs_routes() -> Router<Triggr> {
    // SwaggerUi doesn’t need state, but we can *set* the state type so it merges cleanly.
    Router::from(SwaggerUi::new("/docs").url("/api-doc/openapi.json", ApiDoc::openapi()))
}
