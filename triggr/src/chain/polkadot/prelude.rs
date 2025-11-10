// Copyright (c) 2025, Algorealm Inc.

use std::collections::HashMap;

use scale_info::form::PortableForm;
use scale_info::TypeDef;
use scale_info::TypeDefComposite;
use scale_info::TypeDefVariant;
use scale_info::{PortableRegistry, PortableRegistryBuilder, Type};
use scale_value::{Composite, Primitive, Value, ValueDef};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use tokio::sync::mpsc::Sender;
use tracing::info;
use utoipa::ToSchema;

/// (Ws) url of contracts chain to connect to
pub const CONTRACTS_NODE_URL: &str = "wss://testnet-passet-hub.polkadot.io";

/// Runtime event data
#[derive(Debug, Clone)]
pub struct EventData {
    pub event_name: String,
    pub fields: HashMap<String, JsonValue>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContractMetadata {
    pub types: Vec<PortableType>,
    pub spec: Spec,
    pub source: Option<Source>,     // present in ink! metadata
    pub contract: Option<Contract>, // present in ink! metadata
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortableType {
    pub id: u32,

    #[serde(rename = "type")]
    pub ty: scale_info::TypeDef<scale_info::form::PortableForm>,
}

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct TypeDef {
//     pub path: Option<Vec<String>>,
//     pub params: Option<Vec<TypeParameter>>,
//     pub def: TypeDefDetails,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct TypeParameter {
//     pub name: Option<String>,
//     pub r#type: Option<u32>,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// #[serde(rename_all = "lowercase")]
// pub enum TypeDefDetails {
//     Primitive { primitive: String },

//     Composite { composite: CompositeDef },

//     Variant { variant: VariantDef },

//     Sequence { sequence: SequenceDef },

//     Array { array: ArrayDef },

//     Tuple { tuple: Vec<u32> },

//     Compact { compact: CompactDef },
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct CompositeDef {
//     pub fields: Vec<CompositeField>,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct CompositeField {
//     pub name: Option<String>,
//     pub r#type: u32,
//     #[serde(default)]
//     pub typeName: Option<String>,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct VariantDef {
//     pub variants: Vec<Variant>,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct Variant {
//     pub name: String,
//     pub index: u8,
//     #[serde(default)]
//     pub fields: Vec<VariantField>,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct VariantField {
//     pub r#type: u32,
//     #[serde(default)]
//     pub name: Option<String>,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct SequenceDef {
//     pub r#type: u32,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct ArrayDef {
//     pub len: u32,
//     pub r#type: u32,
// }

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct CompactDef {
//     pub r#type: u32,
// }

/// Complete contract spec
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Spec {
    pub constructors: Vec<ConstructorSpec>,
    pub messages: Vec<MessageSpec>,
    pub events: Vec<EventSpec>,
}

/// Constructors
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConstructorSpec {
    pub label: String,
    pub args: Vec<ArgSpec>,
    pub selector: String,
    #[serde(default)]
    pub docs: Vec<String>,
}

/// Messages
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageSpec {
    pub label: String,
    pub args: Vec<ArgSpec>,
    pub mutates: bool,
    pub return_type: Option<ReturnTypeSpec>,
    pub selector: String,
    #[serde(default)]
    pub docs: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReturnTypeSpec {
    #[serde(rename = "type")]
    pub ty: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArgSpec {
    pub label: String,
    pub type_info: TypeInfo,
    #[serde(default)]
    pub indexed: bool, // Relevant for events
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TypeInfo {
    #[serde(rename = "type")]
    pub type_id: u32,
}

/// Events
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventSpec {
    pub label: String,
    pub args: Vec<ArgSpec>,
    #[serde(default)]
    pub docs: Vec<String>,
}

/// Extra
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Source {
    pub hash: String,
    pub language: String,
    pub compiler: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contract {
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub authors: Vec<String>,
}

/// Simplified output structure
#[derive(Debug, Serialize, Deserialize, Serialize, ToSchema, Clone)]
pub struct SimplifiedEvent {
    label: String,
    args: Vec<String>,
}

impl ContractMetadata {
    /// Get type definition by indexing it with type id.
    pub fn get_type_def(&self, type_id: u32) -> Option<&scale_info::TypeDef<PortableForm>> {
        self.types.iter().find(|t| t.id == type_id).map(|t| &t.ty)
    }

    /// Convert custom metadata into scale-info PortableRegistry
    pub fn build_scale_info_registry(&self) -> scale_info::PortableRegistry {
        let mut builder = scale_info::PortableRegistryBuilder::new();

        for entry in &self.types {
            let ty = scale_info::Type::<scale_info::form::PortableForm> {
                path: Default::default(),
                type_params: vec![],
                type_def: entry.ty.clone(),
                docs: vec![],
            };
            builder.register_type(ty);
        }

        builder.finish()
    }

    /// Convert a SCALE Value (with type context) into JSON recursively.
    pub fn value_to_json(value: &Value<u32>, registry: &PortableRegistry) -> JsonValue {
        match &value.value {
            // --- Structs / composites ---
            ValueDef::Composite(fields) => {
                let ty = registry
                    .resolve(value.context)
                    .expect("Type not found in registry");

                match &ty.type_def {
                    TypeDef::Composite(TypeDefComposite {
                        fields: comp_fields,
                    }) => {
                        let mut map = serde_json::Map::new();

                        for (i, (field_def, field_val)) in
                            comp_fields.iter().zip(fields.values()).enumerate()
                        {
                            let label = field_def
                                .name
                                .clone()
                                .unwrap_or_else(|| format!("field{}", i));
                            map.insert(label, Self::value_to_json(field_val, registry));
                        }

                        JsonValue::Object(map)
                    }
                    _ => panic!("Unexpected type: expected Composite"),
                }
            }

            // --- Enum variants ---
            ValueDef::Variant(variant) => {
                let ty = registry
                    .resolve(value.context)
                    .expect("Type not found in registry");
                match &ty.type_def {
                    TypeDef::Variant(TypeDefVariant { variants }) => {
                        let vinfo = variants
                            .iter()
                            .find(|v| Some(v.name.clone()) == Some(variant.name))
                            .expect("Variant not found");

                        if vinfo.fields.is_empty() {
                            serde_json::json!({ vinfo.name.clone(): "()" })
                        } else {
                            let mut inner = serde_json::Map::new();
                            for (i, (f, val)) in
                                vinfo.fields.iter().zip(variant.values.values()).enumerate()
                            {
                                let label = f.name.clone().unwrap_or_else(|| format!("field{}", i));
                                inner.insert(label, Self::value_to_json(val, registry));
                            }

                            let mut outer = serde_json::Map::new();
                            outer.insert(vinfo.name.clone(), JsonValue::Object(inner));
                            JsonValue::Object(outer)
                        }
                    }
                    _ => panic!("Unexpected type: expected Variant"),
                }
            }

            // --- Bit sequence ---
            ValueDef::BitSequence(bits) => JsonValue::String(format!("{:?}", bits)),

            // --- Primitives ---
            ValueDef::Primitive(p) => match p {
                Primitive::Bool(b) => JsonValue::Bool(*b),
                Primitive::Char(c) => JsonValue::String(c.to_string()),
                Primitive::String(s) => JsonValue::String(s.clone()),

                Primitive::U8(v) => JsonValue::from(*v),
                Primitive::U16(v) => JsonValue::from(*v),
                Primitive::U32(v) => JsonValue::from(*v),
                Primitive::U64(v) => JsonValue::from(*v),
                Primitive::U128(v) => JsonValue::String(v.to_string()), // JSON can’t hold 128-bit ints safely

                Primitive::I8(v) => JsonValue::from(*v),
                Primitive::I16(v) => JsonValue::from(*v),
                Primitive::I32(v) => JsonValue::from(*v),
                Primitive::I64(v) => JsonValue::from(*v),
                Primitive::I128(v) => JsonValue::String(v.to_string()), // same reason as U128
            },
        }
    }
}
