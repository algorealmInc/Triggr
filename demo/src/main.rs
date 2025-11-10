use codec::Decode;
use scale_decode::{visitor, DecodeAsType};
use scale_info::{form::PortableForm, PortableRegistry, TypeDef};
use scale_value::{Composite, Primitive, Value, ValueDef};

// The input value as a variable
fn get_input_value() -> Value<()> {
    Value {
        value: Composite(Unnamed([
            Value {
                value: Primitive(U128(168)),
                context: 2,
            },
            Value {
                value: Primitive(U128(48)),
                context: 2,
            },
            Value {
                value: Primitive(U128(120)),
                context: 2,
            },
            Value {
                value: Primitive(U128(53)),
                context: 2,
            },
            Value {
                value: Primitive(U128(99)),
                context: 2,
            },
            Value {
                value: Primitive(U128(100)),
                context: 2,
            },
            Value {
                value: Primitive(U128(54)),
                context: 2,
            },
            Value {
                value: Primitive(U128(49)),
                context: 2,
            },
            Value {
                value: Primitive(U128(57)),
                context: 2,
            },
            Value {
                value: Primitive(U128(97)),
                context: 2,
            },
            Value {
                value: Primitive(U128(51)),
                context: 2,
            },
            Value {
                value: Primitive(U128(101)),
                context: 2,
            },
            Value {
                value: Primitive(U128(55)),
                context: 2,
            },
            Value {
                value: Primitive(U128(57)),
                context: 2,
            },
            Value {
                value: Primitive(U128(102)),
                context: 2,
            },
            Value {
                value: Primitive(U128(100)),
                context: 2,
            },
            Value {
                value: Primitive(U128(49)),
                context: 2,
            },
            Value {
                value: Primitive(U128(52)),
                context: 2,
            },
            Value {
                value: Primitive(U128(57)),
                context: 2,
            },
            Value {
                value: Primitive(U128(51)),
                context: 2,
            },
            Value {
                value: Primitive(U128(50)),
                context: 2,
            },
            Value {
                value: Primitive(U128(97)),
                context: 2,
            },
            Value {
                value: Primitive(U128(99)),
                context: 2,
            },
            Value {
                value: Primitive(U128(48)),
                context: 2,
            },
            Value {
                value: Primitive(U128(48)),
                context: 2,
            },
            Value {
                value: Primitive(U128(98)),
                context: 2,
            },
            Value {
                value: Primitive(U128(56)),
                context: 2,
            },
            Value {
                value: Primitive(U128(53)),
                context: 2,
            },
            Value {
                value: Primitive(U128(52)),
                context: 2,
            },
            Value {
                value: Primitive(U128(100)),
                context: 2,
            },
            Value {
                value: Primitive(U128(99)),
                context: 2,
            },
            Value {
                value: Primitive(U128(48)),
                context: 2,
            },
            Value {
                value: Primitive(U128(57)),
                context: 2,
            },
            Value {
                value: Primitive(U128(102)),
                context: 2,
            },
            Value {
                value: Primitive(U128(97)),
                context: 2,
            },
            Value {
                value: Primitive(U128(51)),
                context: 2,
            },
            Value {
                value: Primitive(U128(48)),
                context: 2,
            },
            Value {
                value: Primitive(U128(52)),
                context: 2,
            },
            Value {
                value: Primitive(U128(101)),
                context: 2,
            },
            Value {
                value: Primitive(U128(100)),
                context: 2,
            },
            Value {
                value: Primitive(U128(49)),
                context: 2,
            },
            Value {
                value: Primitive(U128(56)),
                context: 2,
            },
            Value {
                value: Primitive(U128(102)),
                context: 2,
            },
        ])),
        context: 14,
    }
}

/// SCALE decode function that takes a Value and metadata and decodes it
fn scale_decode(
    value: Value<()>,
    type_id: u32,
    registry: &PortableRegistry,
) -> Result<String, String> {
    // Get the type definition from the registry
    let type_def = registry
        .resolve(type_id)
        .ok_or_else(|| format!("Type ID {} not found in registry", type_id))?;

    // Decode based on the type definition
    match type_def.type_def() {
        TypeDef::Composite(composite) => decode_composite(&value, composite, registry),
        TypeDef::Array(array) => decode_array(
            &value,
            array.type_param().id(),
            array.len() as usize,
            registry,
        ),
        TypeDef::Primitive(primitive) => decode_primitive(&value, primitive),
        _ => Err("Unsupported type".to_string()),
    }
}

fn decode_composite(
    value: &Value<()>,
    composite: &scale_info::TypeDefComposite<PortableForm>,
    registry: &PortableRegistry,
) -> Result<String, String> {
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(fields)) => {
            let composite_fields = composite.fields();

            // If single unnamed field, unwrap it (like AccountId wrapping [u8; 32])
            if composite_fields.len() == 1 && composite_fields[0].name().is_none() {
                let field_type_id = composite_fields[0].ty().id();
                return scale_decode(fields[0].clone(), field_type_id, registry);
            }

            let mut results = Vec::new();
            for (i, field) in fields.iter().enumerate() {
                if let Some(field_def) = composite_fields.get(i) {
                    let decoded = scale_decode(field.clone(), field_def.ty().id(), registry)?;
                    let field_name = field_def
                        .name()
                        .map(|n| n.to_string())
                        .unwrap_or_else(|| i.to_string());
                    results.push(format!("{}: {}", field_name, decoded));
                }
            }
            Ok(format!("{{ {} }}", results.join(", ")))
        }
        _ => Err("Expected composite value".to_string()),
    }
}

fn decode_array(
    value: &Value<()>,
    element_type_id: u32,
    len: usize,
    registry: &PortableRegistry,
) -> Result<String, String> {
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(fields)) => {
            if fields.len() != len {
                return Err(format!(
                    "Array length mismatch: expected {}, got {}",
                    len,
                    fields.len()
                ));
            }

            // Try to decode as bytes first
            let mut bytes = Vec::new();
            let mut all_u8 = true;

            for field in fields {
                match &field.value {
                    ValueDef::Primitive(Primitive::U128(v)) if *v <= 255 => {
                        bytes.push(*v as u8);
                    }
                    _ => {
                        all_u8 = false;
                        break;
                    }
                }
            }

            if all_u8 {
                // Return as hex string
                Ok(format!("0x{}", hex::encode(&bytes)))
            } else {
                // Decode each element
                let mut results = Vec::new();
                for field in fields {
                    let decoded = scale_decode(field.clone(), element_type_id, registry)?;
                    results.push(decoded);
                }
                Ok(format!("[{}]", results.join(", ")))
            }
        }
        _ => Err("Expected composite for array".to_string()),
    }
}

fn decode_primitive(
    value: &Value<()>,
    primitive: &scale_info::TypeDefPrimitive,
) -> Result<String, String> {
    use scale_info::TypeDefPrimitive;

    match &value.value {
        ValueDef::Primitive(prim) => match (prim, primitive) {
            (Primitive::U128(v), TypeDefPrimitive::U8) if *v <= 255 => Ok((*v as u8).to_string()),
            (Primitive::U128(v), TypeDefPrimitive::U128) => Ok(v.to_string()),
            (Primitive::Bool(v), TypeDefPrimitive::Bool) => Ok(v.to_string()),
            (Primitive::String(s), TypeDefPrimitive::Str) => Ok(s.clone()),
            _ => Err(format!(
                "Primitive type mismatch: {:?} vs {:?}",
                prim, primitive
            )),
        },
        _ => Err("Expected primitive value".to_string()),
    }
}

fn build_metadata_registry() -> PortableRegistry {
    use scale_info::{
        Field, Path, Registry, Type, TypeDefArray, TypeDefComposite, TypeDefPrimitive,
    };

    let mut registry = Registry::new();

    // Type 0: u128
    registry.register_type(&Type::new(
        Path::default(),
        vec![],
        TypeDef::Primitive(TypeDefPrimitive::U128),
        vec![],
    ));

    // Type 1: bool
    registry.register_type(&Type::new(
        Path::default(),
        vec![],
        TypeDef::Primitive(TypeDefPrimitive::Bool),
        vec![],
    ));

    // Type 8: u8
    registry.register_type(&Type::new(
        Path::default(),
        vec![],
        TypeDef::Primitive(TypeDefPrimitive::U8),
        vec![],
    ));

    // Type 9: str
    registry.register_type(&Type::new(
        Path::default(),
        vec![],
        TypeDef::Primitive(TypeDefPrimitive::Str),
        vec![],
    ));

    // Type 14: [u8; 32]
    registry.register_type(&Type::new(
        Path::default(),
        vec![],
        TypeDef::Array(TypeDefArray::new(32, scale_info::meta_type::<u8>())),
        vec![],
    ));

    // Type 13: AccountId (composite wrapping [u8; 32])
    registry.register_type(&Type::new(
        Path::from(["ink_primitives", "types", "AccountId"]),
        vec![],
        TypeDef::Composite(TypeDefComposite::new(vec![Field::new(
            None,
            scale_info::meta_type::<[u8; 32]>(),
            None,
            vec![],
        )])),
        vec![],
    ));

    registry.into()
}

fn main() {
    // Build the metadata registry
    let registry = build_metadata_registry();

    // Get the input value
    let input_value = get_input_value();

    println!("Decoding value with type_id 14 ([u8; 32])...");

    // Decode with type_id 14 (the context from your input)
    match scale_decode(input_value.clone(), 14, &registry) {
        Ok(decoded) => {
            println!("Successfully decoded!");
            println!("Result: {}", decoded);

            // Also try to decode as ASCII string
            if let ValueDef::Composite(Composite::Unnamed(fields)) = &input_value.value {
                let bytes: Vec<u8> = fields
                    .iter()
                    .filter_map(|f| {
                        if let ValueDef::Primitive(Primitive::U128(v)) = f.value {
                            if v <= 255 {
                                Some(v as u8)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    })
                    .collect();

                if let Ok(text) = String::from_utf8(bytes) {
                    println!("As ASCII string: {}", text);
                }
            }
        }
        Err(e) => {
            println!("Error decoding: {}", e);
        }
    }

    let k = ContractMetadata { spec: ContractSpec { events: [EventSpec { label: "Transfer", signature_topic: "0xe8ef93024d2facbef5d00b53971fc6c8a7e645a7a88e11c2067b9ccc8575dd31", args: [EventArg { label: "source", indexed: false, type_info: TypeInfo { type_id: 9, display_name: ["String"] } }, EventArg { label: "recipient", indexed: false, type_info: TypeInfo { type_id: 9, display_name: ["String"] } }, EventArg { label: "amount", indexed: false, type_info: TypeInfo { type_id: 0, display_name: ["u128"] } }, EventArg { label: "message", indexed: false, type_info: TypeInfo { type_id: 9, display_name: ["String"] } }] }, EventSpec { label: "ThresholdUpdated", signature_topic: "0xa36914b4e6e6b65947c399d738dd2b841eb78e03cebd3a203367872bdbb23b4d", args: [EventArg { label: "old_value", indexed: false, type_info: TypeInfo { type_id: 0, display_name: ["u128"] } }, EventArg { label: "new_value", indexed: false, type_info: TypeInfo { type_id: 0, display_name: ["u128"] } }, EventArg { label: "updated_by", indexed: false, type_info: TypeInfo { type_id: 9, display_name: ["String"] } }] }, EventSpec { label: "Paused", signature_topic: "0xb73dd34074100d5c7f150e60f0801b533b62b57f1f6e5862314cb25ed68230ed", args: [EventArg { label: "paused_by", indexed: false, type_info: TypeInfo { type_id: 9, display_name: ["String"] } }] }, EventSpec { label: "Unpaused", signature_topic: "0x93e86a8f3cc0c1699bc5ba6c2f84e89c5c265e45cfca43c213b495cb3c27b4fc", args: [EventArg { label: "resumed_by", indexed: false, type_info: TypeInfo { type_id: 9, display_name: ["String"] } }] }] }, types: [TypeDef { id: 0, type_def: TypeDefDetails { path: None, def: Object {"primitive": String("u128")} } }, TypeDef { id: 1, type_def: TypeDefDetails { path: None, def: Object {"primitive": String("bool")} } }, TypeDef { id: 2, type_def: TypeDefDetails { path: Some(["chain", "whale_mvp", "WhaleMVP"]), def: Object {"composite": Object {"fields": Array [Object {"name": String("threshold"), "type": Number(0), "typeName": String("<u128 as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<1822470478u32, ()>,>>::Type")}, Object {"name": String("paused"), "type": Number(1), "typeName": String("<bool as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<1495229630u32, ()>,>>::Type")}]}} } }, TypeDef { id: 3, type_def: TypeDefDetails { path: Some(["Result"]), def: Object {"variant": Object {"variants": Array [Object {"fields": Array [Object {"type": Number(4)}], "index": Number(0), "name": String("Ok")}, Object {"fields": Array [Object {"type": Number(5)}], "index": Number(1), "name": String("Err")}]}} } }, TypeDef { id: 4, type_def: TypeDefDetails { path: None, def: Object {"tuple": Array []} } }, TypeDef { id: 5, type_def: TypeDefDetails { path: Some(["ink_primitives", "LangError"]), def: Object {"variant": Object {"variants": Array [Object {"index": Number(1), "name": String("CouldNotReadInput")}]}} } }, TypeDef { id: 6, type_def: TypeDefDetails { path: Some(["primitive_types", "H160"]), def: Object {"composite": Object {"fields": Array [Object {"type": Number(7), "typeName": String("[u8; 20]")}]}} } }, TypeDef { id: 7, type_def: TypeDefDetails { path: None, def: Object {"array": Object {"len": Number(20), "type": Number(8)}} } }, TypeDef { id: 8, type_def: TypeDefDetails { path: None, def: Object {"primitive": String("u8")} } }, TypeDef { id: 9, type_def: TypeDefDetails { path: None, def: Object {"primitive": String("str")} } }, TypeDef { id: 10, type_def: TypeDefDetails { path: Some(["Result"]), def: Object {"variant": Object {"variants": Array [Object {"fields": Array [Object {"type": Number(9)}], "index": Number(0), "name": String("Ok")}, Object {"fields": Array [Object {"type": Number(5)}], "index": Number(1), "name": String("Err")}]}} } }, TypeDef { id: 11, type_def: TypeDefDetails { path: Some(["Result"]), def: Object {"variant": Object {"variants": Array [Object {"fields": Array [Object {"type": Number(0)}], "index": Number(0), "name": String("Ok")}, Object {"fields": Array [Object {"type": Number(5)}], "index": Number(1), "name": String("Err")}]}} } }, TypeDef { id: 12, type_def: TypeDefDetails { path: Some(["Result"]), def: Object {"variant": Object {"variants": Array [Object {"fields": Array [Object {"type": Number(1)}], "index": Number(0), "name": String("Ok")}, Object {"fields": Array [Object {"type": Number(5)}], "index": Number(1), "name": String("Err")}]}} } }, TypeDef { id: 13, type_def: TypeDefDetails { path: Some(["ink_primitives", "types", "AccountId"]), def: Object {"composite": Object {"fields": Array [Object {"type": Number(14), "typeName": String("[u8; 32]")}]}} } }, TypeDef { id: 14, type_def: TypeDefDetails { path: None, def: Object {"array": Object {"len": Number(32), "type": Number(8)}} } }, TypeDef { id: 15, type_def: TypeDefDetails { path: Some(["ink_primitives", "types", "Hash"]), def: Object {"composite": Object {"fields": Array [Object {"type": Number(14), "typeName": String("[u8; 32]")}]}} } }, TypeDef { id: 16, type_def: TypeDefDetails { path: None, def: Object {"primitive": String("u64")} } }, TypeDef { id: 17, type_def: TypeDefDetails { path: None, def: Object {"primitive": String("u32")} } }] };
}
