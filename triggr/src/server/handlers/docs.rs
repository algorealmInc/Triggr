// Apache 2.0 License
// Copyright (c) 2025, Algorealm Inc.

use super::*;
use crate::server::handlers::console::CreateProjectResponse;
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(db::insert_document, db::get_document, db::update_document, db::delete_document, db::list_documents, db::list_collections,
        console::login, console::create_project, console::delete_project, console::list_projects
    ),
    components(schemas(Document, DocMetadata, Project, CreateProjectResponse)),
    tags(
        (name = "Docs", description = "Document REST endpoints")
    )
)]
pub struct ApiDoc;
