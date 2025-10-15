// Copyright (c) 2025, Algorealm Inc.

// This bin crate is to experiment and run all test code.

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
    GreaterThan(String, f64),      // field > value
    LessThan(String, f64),         // field < value
    Equals(String, Value),         // field == value
    NotEquals(String, Value),      // field != value
    GreaterOrEqual(String, f64),   // field >= value
    LessOrEqual(String, f64),      // field <= value
    And(Box<Condition>, Box<Condition>),
    Or(Box<Condition>, Box<Condition>),
}

/// DSL Action
#[derive(Debug, Clone)]
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

/// DSL Executor
pub struct DSLExecutor;

impl DSLExecutor {
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

/// Builder for creating DSL scripts programmatically
pub struct ScriptBuilder {
    events: Vec<EventDefinition>,
    rules: Vec<Rule>,
}

impl ScriptBuilder {
    pub fn new() -> Self {
        Self {
            events: Vec::new(),
            rules: Vec::new(),
        }
    }
    
    pub fn add_event(mut self, name: &str, fields: Vec<&str>) -> Self {
        self.events.push(EventDefinition {
            name: name.to_string(),
            fields: fields.iter().map(|s| s.to_string()).collect(),
        });
        self
    }
    
    pub fn add_rule(mut self, rule: Rule) -> Self {
        self.rules.push(rule);
        self
    }
    
    pub fn build(self) -> Script {
        Script {
            events: self.events,
            rules: self.rules,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_events() {
        let dsl = r#"
        const events = [
            transferred { amount },
            moneyWithdrawn { amount, recipient },
            loanGiven { amount }
        ]
        "#;
        
        let events = DSLParser::parse_events(dsl).unwrap();
        assert_eq!(events.len(), 3);
        assert_eq!(events[0].name, "transferred");
        assert_eq!(events[0].fields, vec!["amount"]);
        assert_eq!(events[1].name, "moneyWithdrawn");
        assert_eq!(events[1].fields, vec!["amount", "recipient"]);
    }
    
    #[test]
    fn test_parse_condition() {
        let cond1 = DSLParser::parse_condition("amount > 200000").unwrap();
        let cond2 = DSLParser::parse_condition("amount >= 100000").unwrap();
        let cond3 = DSLParser::parse_condition("status == \"active\"").unwrap();
        
        assert!(matches!(cond1, Condition::GreaterThan(_, _)));
        assert!(matches!(cond2, Condition::GreaterOrEqual(_, _)));
        assert!(matches!(cond3, Condition::Equals(_, _)));
    }
    
    #[test]
    fn test_evaluate_condition() {
        let mut event_data = HashMap::new();
        event_data.insert("amount".to_string(), json!(250000));
        
        let event = EventData {
            event_name: "transferred".to_string(),
            fields: event_data,
        };
        
        let condition = Condition::GreaterThan("amount".to_string(), 200000.0);
        assert!(DSLExecutor::evaluate_condition(&condition, &event));
        
        let condition2 = Condition::LessThan("amount".to_string(), 200000.0);
        assert!(!DSLExecutor::evaluate_condition(&condition2, &event));
    }
}

fn main() {
    println!("🚀 Event-Driven DSL Example\n");
    
    // Example 1: Parse events from DSL
    let dsl = r#"
    const events = [
        transferred { amount },
        moneyWithdrawn { amount, recipient },
        loanGiven { amount }
    ]
    "#;
    
    let events = DSLParser::parse_events(dsl).unwrap();
    println!("📋 Parsed Events:");
    for event in &events {
        println!("  - {} {{ {} }}", event.name, event.fields.join(", "));
    }
    
    // Example 2: Build a script programmatically
    let script = ScriptBuilder::new()
        .add_event("transferred", vec!["amount"])
        .add_event("moneyWithdrawn", vec!["amount", "recipient"])
        .add_rule(Rule {
            event_name: "transferred".to_string(),
            condition: Some(Condition::GreaterThan("amount".to_string(), 200000.0)),
            actions: vec![
                Action::Update {
                    collection: "transactions".to_string(),
                    id: "tx_123".to_string(),
                    fields: {
                        let mut map = HashMap::new();
                        map.insert("status".to_string(), json!("flagged"));
                        map.insert("reviewed".to_string(), json!(false));
                        map
                    },
                },
                Action::Notify {
                    message: "Large transfer detected".to_string(),
                },
            ],
        })
        .add_rule(Rule {
            event_name: "transferred".to_string(),
            condition: Some(Condition::LessOrEqual("amount".to_string(), 200000.0)),
            actions: vec![
                Action::Delete {
                    collection: "pending".to_string(),
                    id: "tx_123".to_string(),
                },
            ],
        })
        .build();
    
    println!("\n📜 Script Rules: {} rules defined", script.rules.len());
    
    // Example 3: Execute rules on event data
    println!("\n🎯 Executing Rules:");
    
    let mut event_fields = HashMap::new();
    event_fields.insert("amount".to_string(), json!(250000));
    
    let event = EventData {
        event_name: "transferred".to_string(),
        fields: event_fields,
    };
    
    for (i, rule) in script.rules.iter().enumerate() {
        if let Some(actions) = DSLExecutor::execute_rule(rule, &event) {
            println!("  ✓ Rule {} matched! Actions:", i + 1);
            for action in actions {
                match action {
                    Action::Update { collection, id, fields } => {
                        println!("    → Update {} @ {} with {:?}", collection, id, fields);
                    }
                    Action::Delete { collection, id } => {
                        println!("    → Delete {} @ {}", collection, id);
                    }
                    Action::Notify { message } => {
                        println!("    → Notify: {}", message);
                    }
                    _ => {}
                }
            }
        }
    }
}