// Copyright (c) 2025, Algorealm Inc.

use base64::{Engine as _, engine::general_purpose};
use rand::{TryRngCore, rngs::OsRng, RngCore};
use uuid::Uuid;

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


use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use serde_json::Value;

/// Error type for encryption/decryption operations
#[derive(Debug)]
pub enum CryptoError {
    EncryptionFailed,
    DecryptionFailed,
    InvalidFormat,
    InvalidKey,
}

impl std::fmt::Display for CryptoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CryptoError::EncryptionFailed => write!(f, "Encryption failed"),
            CryptoError::DecryptionFailed => write!(f, "Decryption failed"),
            CryptoError::InvalidFormat => write!(f, "Invalid encrypted data format"),
            CryptoError::InvalidKey => write!(f, "Invalid encryption key"),
        }
    }
}

impl std::error::Error for CryptoError {}

/// Encrypt a plaintext string using AES-256-GCM
/// 
/// # Arguments
/// * `plaintext` - The string to encrypt
/// * `key_base64` - Base64-encoded 256-bit encryption key
/// 
/// # Returns
/// Base64-encoded string containing: nonce (12 bytes) + ciphertext + auth tag
/// 
/// # Example
/// ```
/// let key = generate_nonce<32>();
/// let encrypted = encrypt("Hello, World!", &key).unwrap();
/// let decrypted = decrypt(&encrypted, &key).unwrap();
/// assert_eq!(decrypted, "Hello, World!");
/// ```
pub fn encrypt(plaintext: &str, key_base64: &str) -> Result<String, CryptoError> {
    // Decode the key from base64
    let key_bytes = general_purpose::STANDARD
        .decode(key_base64)
        .map_err(|_| CryptoError::InvalidKey)?;
    
    if key_bytes.len() != 32 {
        return Err(CryptoError::InvalidKey);
    }
    
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // Generate a random 96-bit nonce (12 bytes)
    let mut nonce_bytes = [0u8; 12];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // Encrypt the plaintext
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|_| CryptoError::EncryptionFailed)?;
    
    // Combine nonce + ciphertext for storage
    let mut result: Vec<u8> = nonce_bytes.into();
    result.extend_from_slice(&ciphertext);
    
    // Encode to base64 for easy storage/transmission
    let str = general_purpose::STANDARD.encode(&result);

    // Replace all "/" with "_"
    Ok(str.replace("/", "_"))
}

/// Decrypt a ciphertext string using AES-256-GCM
/// 
/// # Arguments
/// * `encrypted_base64` - Base64-encoded encrypted data (nonce + ciphertext + tag)
/// * `key_base64` - Base64-encoded 256-bit encryption key (same as used for encryption)
/// 
/// # Returns
/// The original plaintext string
pub fn decrypt(encrypted_base64: &str, key_base64: &str) -> Result<String, CryptoError> {

    // Replace string before decoding
    let encrypted_base64 = encrypted_base64.replace("_", "/");

    // Decode the key from base64
    let key_bytes = general_purpose::STANDARD
        .decode(key_base64)
        .map_err(|_| CryptoError::InvalidKey)?;
    
    if key_bytes.len() != 32 {
        return Err(CryptoError::InvalidKey);
    }
    
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // Decode the encrypted data from base64
    let encrypted_data = general_purpose::STANDARD
        .decode(encrypted_base64)
        .map_err(|_| CryptoError::InvalidFormat)?;
    
    // Extract nonce (first 12 bytes) and ciphertext (rest)
    if encrypted_data.len() < 12 {
        return Err(CryptoError::InvalidFormat);
    }
    
    let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    // Decrypt the ciphertext
    let plaintext_bytes = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)?;
    
    // Convert bytes to string
    String::from_utf8(plaintext_bytes)
        .map_err(|_| CryptoError::DecryptionFailed)

}

/// Databse introduction
pub fn introduce_triggr() {
    println!("⚡️ Triggr - Realtime, event-driven backend for Web3 applications");
    println!("📄 Licence: https://github.com/algorealmInc/Triggr/blob/main/LICENCE.md");
    println!("Copyright (c) 2025 Algorealm, Inc.");
    println!();
}


/// Process event value by stripping wrappers and converting types
pub fn process_event_value(value: &Value) -> Value {
    match value {
        Value::String(s) => {
            // Strip Some() and Ok() wrappers
            let cleaned = strip_wrappers(s);
            
            // Try to parse as number first, otherwise keep as string
            if let Ok(num) = cleaned.parse::<u128>() {
                return Value::Number(num.into());
            } else if let Ok(num) = cleaned.parse::<i64>() {
                return Value::Number(num.into());
            } else if let Ok(num) = cleaned.parse::<f64>() {
                if let Some(json_num) = serde_json::Number::from_f64(num) {
                    return Value::Number(json_num);
                }
            } else if cleaned == "true" {
                return Value::Bool(true);
            } else if cleaned == "false" {
                return Value::Bool(false);
            }
            
            // Return cleaned string
            Value::String(cleaned.to_string())
        }
        // If it's already a proper JSON value type, return as-is
        _ => value.clone()
    }
}

/// Strip Some() and Ok() wrappers from a string
pub fn strip_wrappers(value: &str) -> &str {
    let mut result = value.trim();
    
    // Strip Some() wrapper
    if result.starts_with("Some(") && result.ends_with(')') {
        result = &result[5..result.len()-1];
    }
    
    // Strip Ok() wrapper
    if result.starts_with("Ok(") && result.ends_with(')') {
        result = &result[3..result.len()-1];
    }
    
    // Strip both in case of nested wrapping like Ok(Some(...))
    if result.starts_with("Some(") && result.ends_with(')') {
        result = &result[5..result.len()-1];
    }
    
    result.trim()
}

/// Generate random UUID
pub fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

/// Check if a string is a UUID
pub fn is_uuid(input: &str) -> bool {
    Uuid::parse_str(input).is_ok()
}