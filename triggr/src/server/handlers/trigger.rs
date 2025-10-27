// Copyright (c) 2025, Algorealm Inc.

// Module containing handlers for routes containing trigger requests.


// Handler to create an new trigger.
// #[utoipa::path(
//     post,
//     path = "/api/trigger/create",
//     responses(
//         (status = 201, description = "Document inserted successfully", body = inline(serde_json::Value)),
//         (status = 400, description = "Invalid document or malformed request"),
//         (status = 500, description = "Internal server error")
//     )
// )]
// pub async fn create_trigger(
//     ref_project: RefProject,
//     State(triggr): State<Triggr>,
//     Path(name): Path<String>,
//     Json(doc): Json<Document>,
// ) -> Result<impl IntoResponse, AppError> {
//     DocumentStore::insert(&*triggr.store, &ref_project.project.id, &name, doc).await?;
//     Ok((StatusCode::CREATED, Json(json!({ "ok": true }))))
// }