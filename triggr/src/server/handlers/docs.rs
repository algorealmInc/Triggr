// Copyright (c) 2025, Algorealm Inc.

// Swagger docs

use super::*;
use crate::server::handlers::{
    console::CreateProjectResponse,
    trigger::StoreTrigger,
    storage::CollectionSummary
};

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(db::insert_document, db::get_document, db::update_document, db::delete_document, db::list_documents, db::list_collections,
        console::login, console::create_project, console::delete_project, console::list_projects,
        trigger::save_trigger, trigger::list_triggers, trigger::get_trigger, trigger::delete_trigger, trigger::update_trigger_state
    ),
    components(schemas(Document, DocMetadata, Project, CreateProjectResponse, StoreTrigger, SlimTrigger, CollectionSummary)),
    tags(
        (name = "Docs", description = "Document REST endpoints")
    )
)]
pub struct ApiDoc;
