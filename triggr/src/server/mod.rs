// Copyright (c) 2025, Algorealm Inc.

// This module enables Triggr to interface with the outside world through http and ws.

mod routes;
pub(crate) mod startup;
mod middleware;
mod handlers;

use super::*;