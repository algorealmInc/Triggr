#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod whale_mvp {
    use ink::prelude::string::String;
    use ink::prelude::format;
    use ink::H160;

    #[ink(storage)]
    pub struct WhaleMVP {
        threshold: u128,
        paused: bool,
    }

    // ----------------------------------------------------------
    // EVENTS (All fields are Strings or u128 for MVP compatibility)
    // ----------------------------------------------------------

    #[ink(event)]
    pub struct Transfer {
        pub source: String,
        pub recipient: String,
        pub amount: u128,
        pub message: String,
    }

    #[ink(event)]
    pub struct ThresholdUpdated {
        pub old_value: u128,
        pub new_value: u128,
        pub updated_by: String,
    }

    #[ink(event)]
    pub struct Paused {
        pub paused_by: String,
    }

    #[ink(event)]
    pub struct Unpaused {
        pub resumed_by: String,
    }

    impl WhaleMVP {
        // ----------------------------
        // Constructor
        // ----------------------------
        #[ink(constructor)]
        pub fn new(initial_threshold: u128) -> Self {
            Self {
                threshold: initial_threshold,
                paused: false,
            }
        }

        // ----------------------------
        // TRANSFER
        // ----------------------------
        #[ink(message)]
        pub fn transfer(
            &mut self,
            recipient: H160,
            amount: u128,
            message: String,
        ) -> String {
            assert!(!self.paused, "Contract is paused");

            let caller = self.env().caller();

            // Convert H160 → String (safe for MVP decoding)
            let caller_str = format!("{caller:?}");
            let recipient_str = format!("{recipient:?}");

            // Emit primitive-only event
            self.env().emit_event(Transfer {
                source: caller_str,
                recipient: recipient_str,
                amount,
                message: message.clone(),
            });

            String::from("TRANSFER_EMITTED")
        }

        // ----------------------------
        // UPDATE THRESHOLD
        // ----------------------------
        #[ink(message)]
        pub fn update_threshold(&mut self, new_value: u128) -> String {
            assert!(!self.paused, "Contract is paused");

            let old_value = self.threshold;
            self.threshold = new_value;

            let caller = self.env().caller();
            let caller_str = format!("{caller:?}");

            self.env().emit_event(ThresholdUpdated {
                old_value,
                new_value,
                updated_by: caller_str,
            });

            String::from("THRESHOLD_UPDATED")
        }

        // ----------------------------
        // PAUSE CONTRACT
        // ----------------------------
        #[ink(message)]
        pub fn pause(&mut self) -> String {
            self.paused = true;

            let caller = self.env().caller();
            let caller_str = format!("{caller:?}");

            self.env().emit_event(Paused {
                paused_by: caller_str,
            });

            String::from("PAUSED")
        }

        // ----------------------------
        // UNPAUSE CONTRACT
        // ----------------------------
        #[ink(message)]
        pub fn unpause(&mut self) -> String {
            self.paused = false;

            let caller = self.env().caller();
            let caller_str = format!("{caller:?}");

            self.env().emit_event(Unpaused {
                resumed_by: caller_str,
            });

            String::from("UNPAUSED")
        }

        // ----------------------------
        // GETTERS (simple primitives)
        // ----------------------------
        #[ink(message)]
        pub fn get_threshold(&self) -> u128 {
            self.threshold
        }

        #[ink(message)]
        pub fn is_paused(&self) -> bool {
            self.paused
        }
    }
}
