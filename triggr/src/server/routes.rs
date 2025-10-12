// Copyright (c) 2025, Algorealm Inc.

use super::handlers::{console, db, ws};
use super::middleware as midw;
use super::*;
use axum::routing::{delete, get};
use axum::{middleware as mw, routing::post, Router};

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
        .route("/api/console/login", get(console::login))
        .route("/api/console/project", post(console::create_project))
        .route(
            "/api/console/project/{api_key}",
            delete(console::delete_project),
        )
        .route("/api/console/projects", delete(console::list_projects))
}

/// Returns the 'ws' route.
pub fn ws_route() -> Router<Triggr> {
    Router::new()
        .route("/ws", get(ws::ws_handler))
        .route_layer(mw::from_fn(midw::require_api_key))
}
