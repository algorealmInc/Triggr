// Copyright (c) 2025, Algorealm Inc.

use base64::{Engine as _, engine::general_purpose};
use rand::{TryRngCore, rngs::OsRng};

/// Generate a random nonce.
///
/// # Arguments
/// * Constant `N` - Length of the nonce in bytes (e.g. 16 for 128-bit, 32 for 256-bit).
///
/// # Returns
/// A URL-safe, base64-encoded string with no padding.
pub fn generate_nonce<const N: usize>() -> String {
    let mut bytes = [0u8; N]; // 128-bit nonce
    let _ = OsRng.try_fill_bytes(&mut bytes); // ✅ no &, call directly on OsRng
    general_purpose::URL_SAFE_NO_PAD.encode(&bytes)
}
