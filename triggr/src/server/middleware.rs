// Copyright (c) 2025, Algorealm Inc.

// Middleware layer of the server

use std::env;

use crate::util::decrypt;

use super::*;
use async_trait::async_trait;
use axum::{
    body::Body,
    extract::FromRequestParts,
    http::{header, request::Parts, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use futures::Future;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
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
    kid: String,
    alg: String,
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
    #[serde(rename = "sub")]
    pub user_id: String, // <- We alias "sub" directly to user_id
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
        if let Ok(mut key_str) = key.to_str() {
            // Check length of key
            if key_str.len() != 32 {
                // This request is coming from the console.
                // Try to decrypt it
                let encryption_key =
                    env::var("TRIGGR_ENCRYPTION_KEY").or_else(|_| Err(StatusCode::UNAUTHORIZED))?;
                let decrypted_str = &decrypt(key_str, &encryption_key)
                    .or_else(|_| Err(StatusCode::UNAUTHORIZED))?;

                // Assign decrypted key
                key_str = decrypted_str;

                if let Ok(search_result) = ProjectStore::get(&*triggr.store, key_str) {
                    if let Some(project) = search_result {
                        let project = RefProject { project };

                        req.extensions_mut().insert(project);
                        return Ok(next.run(req).await);
                    }
                }
            }
        }
    }

    Err(StatusCode::UNAUTHORIZED)
}

// Middleware to ensure authentication of session.
#[async_trait]
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
            // let headers = &parts.headers;
            // let token = headers
            //     .get(header::AUTHORIZATION)
            //     .and_then(|h| h.to_str().ok())
            //     .and_then(|h| h.strip_prefix("Bearer "))
            //     .ok_or_else(|| AuthError("Missing Authorization header".into()))?;

            // // Decode header to get key ID (kid)
            // let header =
            //     decode_header(token).map_err(|_| AuthError("Invalid JWT header".into()))?;
            // let kid = header
            //     .kid
            //     .ok_or(AuthError("Missing kid in JWT header".into()))?;

            // // Match JWK by kid
            // let jwk = extract_matching_jwk(&kid)
            //     .map_err(|e| AuthError(format!("Failed to extract JWK: {}", e)))?
            //     .ok_or(AuthError("No matching JWK found".into()))?;

            // // Decode token
            // let decoding_key = DecodingKey::from_rsa_components(&jwk.n, &jwk.e)
            //     .map_err(|_| AuthError("Invalid RSA key components".into()))?;
            // let validation = Validation::new(Algorithm::RS256);

            // let decoded = decode::<ClerkClaims>(token, &decoding_key, &validation)
            //     .map_err(|_| AuthError("Invalid or expired Clerk token".into()))?;

            // Ok(Auth {
            //     claims: decoded.claims,
            // })

            Ok(Auth {
                claims: ClerkClaims {
                    user_id: "jasonXX".to_string(),
                },
            })
        }
    }
}

/// Extract and find the JWK that matches a given `kid`
fn extract_matching_jwk(kid: &str) -> anyhow::Result<Option<Jwk>> {
    let jwks_str = env::var("TRIGGR_CLERKS_JWKS")?;
    let jwks: Jwks = serde_json::from_str(&jwks_str)?;
    Ok(jwks.keys.into_iter().find(|k| k.kid == kid))
}
