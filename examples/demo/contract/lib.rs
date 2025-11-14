// Copyright (c) 2025, Algorealm Inc.
//
// This contract is intentionally simple.
// Purpose: Demonstrate how Triggr listens to smart contract events,
// decodes them, and triggers automation rules.
//
// Features:
// - Emits predictable events
// - Contains both indexed + non-indexed fields
// - Designed for testing Triggr’s event-decoding pipeline

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod event_demo {
    use ink::{
        prelude::{format, string::String},
        H160,
    };

    /// --------------------------------------------------------------
    /// STORAGE STRUCT
    /// --------------------------------------------------------------
    ///
    /// We store a simple counter.
    /// Every time the counter changes, an event is emitted.
    ///
    #[ink(storage)]
    pub struct EventDemo {
        /// A simple numeric counter — used only for event demonstration.
        pub counter: u128,
    }

    /// --------------------------------------------------------------
    /// EVENT STRUCT
    /// --------------------------------------------------------------
    ///
    /// ValueChanged — emitted whenever the contract wants to notify Triggr.
    ///
    /// Triggr listens to all events → decodes → triggers automation rules.
    ///
    /// Fields:
    /// - `from`: Indexed. Helps identify the caller quickly without decoding payload.
    /// - `value`: Indexed. Helps Triggr filter rules like `value > 100` efficiently.
    /// - `message`: Non-indexed. Placed in event payload for full decoding.
    ///
    #[ink(event)]
    pub struct ValueChanged {
        /// Address of the account who caused the event.
        /// Indexed so Triggr can filter by user quickly.
        #[ink(topic)]
        pub from: Option<H160>,

        /// A numerical value associated with the event.
        /// Also indexed — easy to query.
        #[ink(topic)]
        pub value: u128,

        /// A free-text message — useful for logs, notifications, webhooks, etc.
        pub message: String,
    }

    impl EventDemo {
        /// --------------------------------------------------------------
        /// CONSTRUCTOR
        /// --------------------------------------------------------------
        ///
        /// Initializes the counter to zero.
        /// Good starting state for event testing.
        ///
        #[ink(constructor)]
        pub fn new() -> Self {
            Self { counter: 0 }
        }

        /// --------------------------------------------------------------
        /// increment(by)
        /// --------------------------------------------------------------
        ///
        /// Increments the counter and emits a `ValueChanged` event.
        ///
        /// Usage (from UI):
        ///    contract.increment(5)
        ///
        /// Triggr will receive an event like:
        ///
        ///   event: "ValueChanged"
        ///   from: <caller>
        ///   value: <new counter>
        ///   message: "Counter increased by X"
        ///
        #[ink(message)]
        pub fn increment(&mut self, by: u128) {
            let caller = self.env().caller();
            self.counter += by;

            let msg = format!("Counter increased by {}", by);

            // Emit event → Triggr picks it up
            self.env().emit_event(ValueChanged {
                from: Some(caller),
                value: self.counter,
                message: msg,
            });
        }

        /// --------------------------------------------------------------
        /// emit_custom(text, number)
        /// --------------------------------------------------------------
        ///
        /// This is the **main Triggr demo method**.
        ///
        /// Allows UI or script to intentionally fire arbitrary events.
        /// Perfect for testing:
        ///
        /// - webhook triggers
        /// - conditional rules
        /// - action chains
        /// - data capture / logging
        ///
        /// Example:
        ///
        ///    contract.emit_custom("hi triggr", 777)
        ///
        /// Triggr receives:
        ///
        ///   from: <caller>
        ///   value: 777
        ///   message: "hi triggr"
        ///
        #[ink(message)]
        pub fn emit_custom(&self, text: String, number: u128) {
            let caller = self.env().caller();

            self.env().emit_event(ValueChanged {
                from: Some(caller),
                value: number,
                message: text,
            });
        }

        #[ink(message)]
        pub fn get(&self) -> u128 {
            self.counter
        }
    }
}
