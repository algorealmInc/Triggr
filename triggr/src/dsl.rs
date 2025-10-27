// Copyright (c) 2025, Algorealm Inc.

// This module contains code to parse the triggr dsl. Retrieving the DSL from the 
// client-side and parsing, to be executed by the database at the right time.


use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

/// DSL Event Definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDefinition {
    pub name: String,
    pub fields: Vec<String>,
}

/// DSL Condition
#[derive(Debug, Clone)]
pub enum Condition {
    GreaterThan(String, f64),    // field > value
    LessThan(String, f64),       // field < value
    Equals(String, Value),       // field == value
    NotEquals(String, Value),    // field != value
    GreaterOrEqual(String, f64), // field >= value
    LessOrEqual(String, f64),    // field <= value
    And(Box<Condition>, Box<Condition>),
    Or(Box<Condition>, Box<Condition>),
}

/// DSL Action
#[derive(Debug, Clone)]
pub enum Action {
    Update {
        id: String,
        collection: String,
        fields: HashMap<String, Value>,
    },
    Delete {
        id: String,
        collection: String,
    },
    Insert {
        id: String,
        collection: String,
        fields: HashMap<String, Value>,
    },
    Notify {
        message: String,
    },
}

/// DSL Rule
#[derive(Debug, Clone)]
pub struct Rule {
    pub event_name: String,
    pub condition: Option<Condition>,
    pub actions: Vec<Action>,
}

/// DSL Script
#[derive(Debug, Clone)]
pub struct Script {
    pub events: Vec<EventDefinition>,
    pub rules: Vec<Rule>,
}

/// Runtime event data
#[derive(Debug, Clone)]
pub struct EventData {
    pub event_name: String,
    pub fields: HashMap<String, Value>,
}


/// Simple DSL Parser
pub struct DSLParser;

impl DSLParser {
    /// Parse event definitions from DSL string
    ///
    /// Example:
    /// ```
    /// const events = [
    ///     transferred { amount },
    ///     moneyWithdrawn { amount, recipient },
    ///     loanGiven { amount }
    /// ]
    /// ```
    pub fn parse_events(input: &str) -> Result<Vec<EventDefinition>, String> {
        let mut events = Vec::new();

        // Find events section
        let events_start = input
            .find("const events")
            .ok_or("No events definition found")?;
        let events_section = &input[events_start..];
        let bracket_start = events_section.find('[').ok_or("No opening bracket")?;
        let bracket_end = events_section.find(']').ok_or("No closing bracket")?;
        let events_content = &events_section[bracket_start + 1..bracket_end];

        // Parse individual events
        for line in events_content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("//") {
                continue;
            }

            // Remove trailing comma
            let line_clean = trimmed.trim_end_matches(',');

            // Parse: eventName { field1, field2, ... }
            if let Some(brace_pos) = line_clean.find('{') {
                let name = line_clean[..brace_pos].trim().to_string();
                let fields_str = &line_clean[brace_pos + 1..];
                let fields_end = fields_str.find('}').ok_or("No closing brace")?;
                let fields_content = &fields_str[..fields_end];

                let fields: Vec<String> = fields_content
                    .split(',')
                    .map(|f| f.trim().to_string())
                    .filter(|f| !f.is_empty())
                    .collect();

                events.push(EventDefinition {
                    name: name.to_lowercase(),
                    fields,
                });
            }
        }

        Ok(events)
    }

    /// Parse a simple condition
    pub fn parse_condition(input: &str) -> Result<Condition, String> {
        let input = input.trim();

        // Handle AND/OR
        if let Some(and_pos) = input.find(" && ") {
            let left = Self::parse_condition(&input[..and_pos])?;
            let right = Self::parse_condition(&input[and_pos + 4..])?;
            return Ok(Condition::And(Box::new(left), Box::new(right)));
        }

        if let Some(or_pos) = input.find(" || ") {
            let left = Self::parse_condition(&input[..or_pos])?;
            let right = Self::parse_condition(&input[or_pos + 4..])?;
            return Ok(Condition::Or(Box::new(left), Box::new(right)));
        }

        // Handle comparison operators
        if let Some(pos) = input.find(">=") {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 2..]
                .trim()
                .replace(",", "")
                .parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::GreaterOrEqual(field, value));
        }

        if let Some(pos) = input.find("<=") {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 2..]
                .trim()
                .replace(",", "")
                .parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::LessOrEqual(field, value));
        }

        if let Some(pos) = input.find('>') {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 1..]
                .trim()
                .replace(",", "")
                .parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::GreaterThan(field, value));
        }

        if let Some(pos) = input.find('<') {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 1..]
                .trim()
                .replace(",", "")
                .parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::LessThan(field, value));
        }

        if let Some(pos) = input.find("==") {
            let field = input[..pos].trim().to_string();
            let value_str = input[pos + 2..].trim();
            let value = if value_str.starts_with('"') {
                Value::String(value_str.trim_matches('"').to_string())
            } else {
                Value::Number(value_str.parse().map_err(|_| "Invalid value")?)
            };
            return Ok(Condition::Equals(field, value));
        }

        Err("Unable to parse condition".to_string())
    }
}