// Copyright (c) 2025, Algorealm Inc.

// THis module contains code to parse and serialize triggers from the front end.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::chain::polkadot::prelude::EventData;
/// Dsl Event Definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDefinition {
    pub name: String,
    pub fields: Vec<String>,
}

/// Dsl Condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Condition {
    GreaterThan(String, f64),      // field > value
    LessThan(String, f64),         // field < value
    Equals(String, Value),         // field == value
    NotEquals(String, Value),      // field != value
    GreaterOrEqual(String, f64),   // field >= value
    LessOrEqual(String, f64),      // field <= value
    And(Box<Condition>, Box<Condition>),
    Or(Box<Condition>, Box<Condition>),
}

/// Dsl Action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    Update {
        collection: String,
        id: String,
        fields: HashMap<String, Value>,
    },
    Delete {
        collection: String,
        id: String,
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

/// Dsl Rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub event_name: String,
    pub condition: Option<Condition>,
    pub actions: Vec<Action>,
}

/// Dsl Script
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    pub events: Vec<EventDefinition>,
    pub rules: Vec<Rule>,
}

/// Simple Dsl Parser
pub struct DslParser;

impl DslParser {
    /// Parse complete Dsl script from frontend format
    /// 
    /// Example input:
    /// ```
    /// const events = [
    ///     transferred { amount },
    ///     moneyWithdrawn { amount, recipient }
    /// ]
    /// 
    /// fn main(event) {
    ///     if (event.transferred.amount > 200000) {
    ///         update @id with { status: "flagged" }
    ///     } else {
    ///         delete @id
    ///     }
    /// }
    /// ```
    pub fn parse_script(input: &str) -> Result<Script, String> {
        let events = Self::parse_events(input)?;
        let rules = Self::parse_main_function(input, &events)?;
        
        Ok(Script { events, rules })
    }
    
    /// Parse the fn main(events) { ... } block
    pub fn parse_main_function(input: &str, events: &[EventDefinition]) -> Result<Vec<Rule>, String> {
        let mut rules = Vec::new();
        
        // Find fn main block (accept both "event" and "events" parameter)
        let fn_start = input.find("fn main").ok_or("No fn main found")?;
        let fn_section = &input[fn_start..];
        let block_start = fn_section.find('{').ok_or("No opening brace for fn main")?;
        let block_end = Self::find_matching_brace(fn_section, block_start)?;
        let block_content = &fn_section[block_start + 1..block_end];
        
        // Parse if/else statements
        rules.extend(Self::parse_if_else_blocks(block_content, events)?);
        
        Ok(rules)
    }
    
    /// Parse if/else blocks into rules
    fn parse_if_else_blocks(input: &str, events: &[EventDefinition]) -> Result<Vec<Rule>, String> {
        let mut rules = Vec::new();
        let trimmed = input.trim();
        
        // Find if statement
        if let Some(if_pos) = trimmed.find("if ") {
            let rest = &trimmed[if_pos + 3..];
            
            // Extract condition (between if and {)
            let condition_end = rest.find('{').ok_or("No opening brace for if block")?;
            let condition_str = rest[..condition_end].trim();
            
            // Parse condition
            let condition = Self::parse_event_condition(condition_str, events)?;
            
            // Extract if block
            let if_block_start = condition_end;
            let if_block_end = Self::find_matching_brace(rest, if_block_start)?;
            let if_block_content = &rest[if_block_start + 1..if_block_end];
            
            // Parse actions in if block
            let if_actions = Self::parse_action_block(if_block_content)?;
            
            // Create rule for if condition
            if let Some((ref event_name, ref cond)) = condition {
                rules.push(Rule {
                    event_name: event_name.clone(),
                    condition: Some(cond.clone()),
                    actions: if_actions,
                });
            }
            
            // Check for else block
            let after_if = &rest[if_block_end + 1..].trim();
            if after_if.starts_with("else ") || after_if.starts_with("else{") {
                let else_start = after_if.find('{').ok_or("No opening brace for else block")?;
                let else_block_end = Self::find_matching_brace(after_if, else_start)?;
                let else_block_content = &after_if[else_start + 1..else_block_end];
                
                // Parse actions in else block
                let else_actions = Self::parse_action_block(else_block_content)?;
                
                // Create rule for else (negated condition)
                if let Some((event_name, cond)) = condition {
                    let negated_condition = Self::negate_condition(cond);
                    rules.push(Rule {
                        event_name,
                        condition: Some(negated_condition),
                        actions: else_actions,
                    });
                }
            }
        }
        
        Ok(rules)
    }
    
    /// Parse event condition: events.eventName.field > value
    fn parse_event_condition(input: &str, events: &[EventDefinition]) -> Result<Option<(String, Condition)>, String> {
        let input = input.trim();
        
        // Remove parentheses if present
        let input = if input.starts_with('(') && input.ends_with(')') {
            &input[1..input.len() - 1]
        } else {
            input
        };
        
        // Expected format: events.eventName.field > value
        if !input.starts_with("events.") {
            return Err("Condition must start with 'events.'".to_string());
        }
        
        let rest = &input[7..]; // Skip "events."
        
        // Find the event name
        let parts: Vec<&str> = rest.split('.').collect();
        if parts.len() < 2 {
            return Err("Invalid event condition format".to_string());
        }
        
        let event_name = parts[0];
        let field_and_op = parts[1..].join(".");
        
        // Verify event exists
        if !events.iter().any(|e| e.name == event_name) {
            return Err(format!("Unknown event: {}", event_name));
        }
        
        // Parse the comparison
        let condition = Self::parse_comparison(&field_and_op)?;
        
        Ok(Some((event_name.to_string(), condition)))
    }
    
    /// Parse comparison: field > value, field < value, etc.
    fn parse_comparison(input: &str) -> Result<Condition, String> {
        let input = input.trim();
        
        // Handle different operators
        if let Some(pos) = input.find(">=") {
            let field = input[..pos].trim().to_string();
            let value_str = input[pos + 2..].trim().replace(",", "");
            let value: f64 = value_str.parse().map_err(|_| "Invalid number")?;
            return Ok(Condition::GreaterOrEqual(field, value));
        }
        
        if let Some(pos) = input.find("<=") {
            let field = input[..pos].trim().to_string();
            let value_str = input[pos + 2..].trim().replace(",", "");
            let value: f64 = value_str.parse().map_err(|_| "Invalid number")?;
            return Ok(Condition::LessOrEqual(field, value));
        }
        
        if let Some(pos) = input.find('>') {
            let field = input[..pos].trim().to_string();
            let value_str = input[pos + 1..].trim().replace(",", "");
            let value: f64 = value_str.parse().map_err(|_| "Invalid number")?;
            return Ok(Condition::GreaterThan(field, value));
        }
        
        if let Some(pos) = input.find('<') {
            let field = input[..pos].trim().to_string();
            let value_str = input[pos + 1..].trim().replace(",", "");
            let value: f64 = value_str.parse().map_err(|_| "Invalid number")?;
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
        
        if let Some(pos) = input.find("!=") {
            let field = input[..pos].trim().to_string();
            let value_str = input[pos + 2..].trim();
            let value = if value_str.starts_with('"') {
                Value::String(value_str.trim_matches('"').to_string())
            } else {
                Value::Number(value_str.parse().map_err(|_| "Invalid value")?)
            };
            return Ok(Condition::NotEquals(field, value));
        }
        
        Err("Unable to parse comparison".to_string())
    }
    
    /// Negate a condition for else block
    fn negate_condition(condition: Condition) -> Condition {
        match condition {
            Condition::GreaterThan(field, value) => Condition::LessOrEqual(field, value),
            Condition::LessThan(field, value) => Condition::GreaterOrEqual(field, value),
            Condition::GreaterOrEqual(field, value) => Condition::LessThan(field, value),
            Condition::LessOrEqual(field, value) => Condition::GreaterThan(field, value),
            Condition::Equals(field, value) => Condition::NotEquals(field, value),
            Condition::NotEquals(field, value) => Condition::Equals(field, value),
            Condition::And(left, right) => {
                Condition::Or(
                    Box::new(Self::negate_condition(*left)),
                    Box::new(Self::negate_condition(*right))
                )
            }
            Condition::Or(left, right) => {
                Condition::And(
                    Box::new(Self::negate_condition(*left)),
                    Box::new(Self::negate_condition(*right))
                )
            }
        }
    }
    
    /// Parse action block (multiple actions separated by newlines)
    fn parse_action_block(input: &str) -> Result<Vec<Action>, String> {
        let mut actions = Vec::new();
        
        for line in input.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("//") {
                continue;
            }
            
            // Handle ${...} syntax - convert to {...}
            let normalized = if trimmed.contains("${") {
                trimmed.replace("${", "{")
            } else {
                trimmed.to_string()
            };
            
            // Try to parse as action - with error logging
            match Self::parse_action(&normalized) {
                Ok(action) => actions.push(action),
                Err(e) => {
                    // Log but don't fail - some lines might not be actions
                    eprintln!("Warning: Could not parse action '{}': {}", normalized, e);
                }
            }
        }
        
        Ok(actions)
    }
    
    /// Find matching closing brace
    fn find_matching_brace(input: &str, start: usize) -> Result<usize, String> {
        let mut depth = 0;
        let chars: Vec<char> = input.chars().collect();
        
        for i in start..chars.len() {
            if chars[i] == '{' {
                depth += 1;
            } else if chars[i] == '}' {
                depth -= 1;
                if depth == 0 {
                    return Ok(i);
                }
            }
        }
        
        Err("No matching closing brace found".to_string())
    }
    
    /// Parse actions from Dsl string
    /// 
    /// Supports:
    /// - `update @collection:id with { key: value, ... }`
    /// - `delete @collection:id`
    /// - `insert @collection:id with { key: value, ... }`
    /// - `notify "message"`
    /// 
    /// # Example
    /// ```
    /// let action1 = DslParser::parse_action("update @transactions:tx_123 with { status: \"flagged\" }");
    /// let action2 = DslParser::parse_action("delete @pending:tx_456");
    /// let action3 = DslParser::parse_action("notify \"Large transfer detected\"");
    /// ```
    pub fn parse_action(input: &str) -> Result<Action, String> {
        let trimmed = input.trim();
        
        // Parse UPDATE action
        if trimmed.starts_with("update ") {
            return Self::parse_update_action(trimmed);
        }
        
        // Parse DELETE action
        if trimmed.starts_with("delete ") {
            return Self::parse_delete_action(trimmed);
        }
        
        // Parse INSERT action
        if trimmed.starts_with("insert ") {
            return Self::parse_insert_action(trimmed);
        }
        
        // Parse NOTIFY action
        if trimmed.starts_with("notify ") {
            return Self::parse_notify_action(trimmed);
        }
        
        Err(format!("Unknown action: {}", trimmed))
    }
    
    /// Parse update action: update @collection:id with { key: value, ... }
    fn parse_update_action(input: &str) -> Result<Action, String> {
        let input = input.trim_start_matches("update ").trim();
        
        // Handle ${...} syntax - normalize it
        let input = input.replace("${", "{");
        
        // Extract @collection:id
        let with_pos = input.find(" with ").ok_or("Missing 'with' keyword")?;
        let target = input[..with_pos].trim();
        let (collection, id) = Self::parse_target(target)?;
        
        // Extract fields { key: value, ... }
        let fields_str = input[with_pos + 6..].trim();
        let fields = Self::parse_fields(fields_str)?;
        
        Ok(Action::Update {
            collection,
            id,
            fields,
        })
    }
    
    /// Parse delete action: delete @collection:id
    fn parse_delete_action(input: &str) -> Result<Action, String> {
        let input = input.trim_start_matches("delete ").trim();
        let (collection, id) = Self::parse_target(input)?;
        
        Ok(Action::Delete { collection, id })
    }
    
    /// Parse insert action: insert @collection:id with { key: value, ... }
    fn parse_insert_action(input: &str) -> Result<Action, String> {
        let input = input.trim_start_matches("insert ").trim();
        
        // Handle ${...} syntax - normalize it
        let input = input.replace("${", "{");
        
        // Extract @collection:id
        let with_pos = input.find(" with ").ok_or("Missing 'with' keyword")?;
        let target = input[..with_pos].trim();
        let (collection, id) = Self::parse_target(target)?;
        
        // Extract fields
        let fields_str = input[with_pos + 6..].trim();
        let fields = Self::parse_fields(fields_str)?;
        
        Ok(Action::Insert {
            collection,
            id,
            fields,
        })
    }
    
    /// Parse notify action: notify "message"
    fn parse_notify_action(input: &str) -> Result<Action, String> {
        let input = input.trim_start_matches("notify ").trim();
        
        // Remove quotes
        let message = if (input.starts_with('"') && input.ends_with('"'))
            || (input.starts_with('\'') && input.ends_with('\'')) {
            input[1..input.len() - 1].to_string()
        } else {
            input.to_string()
        };
        
        Ok(Action::Notify { message })
    }
    
    /// Parse target: @collection:id or @id (shorthand) or placeholders
    fn parse_target(input: &str) -> Result<(String, String), String> {
        let input = input.trim();
        
        // Remove @ prefix if present
        let input = if input.starts_with('@') {
            &input[1..]
        } else {
            input
        };
        
        // Handle common placeholders
        if input == "id" || input == "ID" {
            return Ok(("__placeholder__".to_string(), "id".to_string()));
        }
        
        // Check if it has a colon (collection:id format)
        if let Some(colon_pos) = input.find(':') {
            let collection = input[..colon_pos].trim().to_string();
            let id = input[colon_pos + 1..].trim().to_string();
            
            if collection.is_empty() {
                return Err("Empty collection name".to_string());
            }
            if id.is_empty() {
                return Err("Empty id".to_string());
            }
            
            Ok((collection, id))
        } else {
            // No colon - treat as shorthand
            let id_value = input.trim().to_string();
            if id_value.is_empty() {
                return Err("Empty target".to_string());
            }
            
            // Use placeholder for collection when not specified
            Ok(("__placeholder__".to_string(), id_value))
        }
    }
    
    /// Parse fields: { key: value, key: value, ... } or { k:v, k:v ... }
    fn parse_fields(input: &str) -> Result<HashMap<String, Value>, String> {
        let input = input.trim();
        
        // Remove curly braces
        let content = if input.starts_with('{') && input.ends_with('}') {
            &input[1..input.len() - 1]
        } else {
            return Err("Fields must be wrapped in { }".to_string());
        };
        
        let mut fields = HashMap::new();
        
        // Handle placeholder syntax: k:v, k:v ...
        if content.trim() == "k:v, k:v ..." || content.trim() == "..." {
            // Return empty map - this is a placeholder
            return Ok(fields);
        }
        
        // Split by comma (simple parser - doesn't handle nested objects)
        for pair in content.split(',') {
            let pair = pair.trim();
            if pair.is_empty() || pair == "..." {
                continue;
            }
            
            // Split by colon
            let colon_pos = pair.find(':').ok_or("Missing ':' in field")?;
            let key = pair[..colon_pos].trim().to_string();
            let value_str = pair[colon_pos + 1..].trim();
            
            // Parse value
            let value = Self::parse_field_value(value_str)?;
            fields.insert(key, value);
        }
        
        Ok(fields)
    }
    
    /// Parse a single field value
    fn parse_field_value(input: &str) -> Result<Value, String> {
        let trimmed = input.trim();
        
        // String values
        if (trimmed.starts_with('"') && trimmed.ends_with('"'))
            || (trimmed.starts_with('\'') && trimmed.ends_with('\'')) {
            let unquoted = &trimmed[1..trimmed.len() - 1];
            return Ok(json!(unquoted));
        }
        
        // Boolean values
        if trimmed == "true" {
            return Ok(json!(true));
        }
        if trimmed == "false" {
            return Ok(json!(false));
        }
        
        // Null
        if trimmed == "null" {
            return Ok(Value::Null);
        }
        
        // Numbers
        if let Ok(num) = trimmed.parse::<i64>() {
            return Ok(json!(num));
        }
        if let Ok(num) = trimmed.parse::<f64>() {
            return Ok(json!(num));
        }
        
        // Try parsing as JSON
        if let Ok(val) = serde_json::from_str(trimmed) {
            return Ok(val);
        }
        
        // Default: treat as string
        Ok(json!(trimmed))
    }
    
    /// Parse event definitions from Dsl string
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
        let events_start = input.find("const events").ok_or("No events definition found")?;
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
                
                events.push(EventDefinition { name, fields });
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
            let value: f64 = input[pos + 2..].trim().replace(",", "").parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::GreaterOrEqual(field, value));
        }
        
        if let Some(pos) = input.find("<=") {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 2..].trim().replace(",", "").parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::LessOrEqual(field, value));
        }
        
        if let Some(pos) = input.find('>') {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 1..].trim().replace(",", "").parse()
                .map_err(|_| "Invalid number")?;
            return Ok(Condition::GreaterThan(field, value));
        }
        
        if let Some(pos) = input.find('<') {
            let field = input[..pos].trim().to_string();
            let value: f64 = input[pos + 1..].trim().replace(",", "").parse()
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

/// Dsl Executor
pub struct DslExecutor;

impl DslExecutor {
    /// Evaluate a condition against event data
    pub fn evaluate_condition(condition: &Condition, event: &EventData) -> bool {
        match condition {
            Condition::GreaterThan(field, value) => {
                if let Some(field_value) = event.fields.get(field) {
                    if let Some(num) = field_value.as_f64() {
                        return num > *value;
                    }
                }
                false
            }
            Condition::LessThan(field, value) => {
                if let Some(field_value) = event.fields.get(field) {
                    if let Some(num) = field_value.as_f64() {
                        return num < *value;
                    }
                }
                false
            }
            Condition::GreaterOrEqual(field, value) => {
                if let Some(field_value) = event.fields.get(field) {
                    if let Some(num) = field_value.as_f64() {
                        return num >= *value;
                    }
                }
                false
            }
            Condition::LessOrEqual(field, value) => {
                if let Some(field_value) = event.fields.get(field) {
                    if let Some(num) = field_value.as_f64() {
                        return num <= *value;
                    }
                }
                false
            }
            Condition::Equals(field, value) => {
                if let Some(field_value) = event.fields.get(field) {
                    return field_value == value;
                }
                false
            }
            Condition::NotEquals(field, value) => {
                if let Some(field_value) = event.fields.get(field) {
                    return field_value != value;
                }
                false
            }
            Condition::And(left, right) => {
                Self::evaluate_condition(left, event) && Self::evaluate_condition(right, event)
            }
            Condition::Or(left, right) => {
                Self::evaluate_condition(left, event) || Self::evaluate_condition(right, event)
            }
        }
    }
    
    /// Execute a rule against event data
    pub fn execute_rule(rule: &Rule, event: &EventData) -> Option<Vec<Action>> {
        // Check if event name matches
        if rule.event_name != event.event_name {
            return None;
        }
        
        // Evaluate condition if present
        if let Some(condition) = &rule.condition {
            if !Self::evaluate_condition(condition, event) {
                return None;
            }
        }
        
        // Return actions to execute
        Some(rule.actions.clone())
    }
}