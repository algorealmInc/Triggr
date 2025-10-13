// Copyright (c) 2025, Algorealm Inc.

// Middleware layer of the server

use std::env;

use super::*;
use axum::{
    body::Body,
    extract::FromRequestParts,
    http::{Request, StatusCode, request::Parts},
    middleware::Next,
    response::{IntoResponse, Response},
};
use futures::Future;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};

/// Represents the project that an incoming request references.
#[derive(Clone)]
pub struct RefProject {
    pub project: Project,
}

#[derive(Debug, Deserialize)]
struct Jwk {
    n: String,
    e: String,
}

#[derive(Debug, Deserialize)]
struct Jwks {
    keys: Vec<Jwk>,
}

#[derive(Debug, Serialize)]
pub struct Auth {
    pub claims: ClerkClaims,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClerkClaims {
    pub sub: String,
    pub user_id: String,
    // Other clerk claims
}

#[derive(Debug)]
pub struct AuthError(pub String);

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        (axum::http::StatusCode::UNAUTHORIZED, self.0).into_response()
    }
}

impl<S> FromRequestParts<S> for RefProject
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> {
        async {
            if let Some(project) = parts.extensions.get::<RefProject>() {
                Ok(project.clone())
            } else {
                Err((StatusCode::UNAUTHORIZED, "Missing project context".into()))
            }
        }
    }
}

// Middleware to ensure API key correctness.
pub async fn require_api_key(mut req: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    // Get the state from extensions
    let triggr = req
        .extensions()
        .get::<Triggr>()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(key) = req.headers().get("x-api-key") {
        if let Ok(key_str) = key.to_str() {
            if let Ok(search_result) = ProjectStore::get(&*triggr.store, key_str) {
                if let Some(project) = search_result {
                    let project = RefProject { project };

                    req.extensions_mut().insert(project);
                    return Ok(next.run(req).await);
                }
            }
        }
    }

    Err(StatusCode::UNAUTHORIZED)
}

// Middleware to ensure authentication of session.
impl<S> FromRequestParts<S> for Auth
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> {
        async {
            let headers = &parts.headers;

            // Authenticate with Clerk JWT
            if let Some(auth_header) = headers.get(axum::http::header::AUTHORIZATION) {
                if let Ok(auth_str) = auth_header.to_str() {
                    if let Some(token) = auth_str.strip_prefix("Bearer ") {
                        // Get decoding key
                        if let Ok(n_and_e) = extract_n_and_e() {
                            if let Some(jwks_values) = n_and_e {
                                let decoding_key = DecodingKey::from_rsa_components(
                                    &jwks_values.0,
                                    &jwks_values.1,
                                )
                                .unwrap();
                                let validation = Validation::new(Algorithm::RS256);
                                let decoded =
                                    decode::<ClerkClaims>(token, &decoding_key, &validation)
                                        .map_err(|_| AuthError("Invalid Clerk token".into()))?;

                                return Ok(Auth {
                                    claims: decoded.claims,
                                });
                            }
                        }
                    }
                }
            }

            Err(AuthError("Missing authentication".into()))
        }
    }
}

// Helper function to extract "n" and "e" from JWKS stored in env
fn extract_n_and_e() -> anyhow::Result<Option<(String, String)>> {
    // Read JWKS JSON from environment variable
    let jwks_str = env::var("TRIGGR_CLERKS_JWKS")?;

    // Parse into structured data
    let jwks: Jwks = serde_json::from_str(&jwks_str)?;

    // Extract the first key’s `n` and `e`
    Ok(jwks.keys.into_iter().next().map(|k| (k.n, k.e)))
}
