#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod whale_watcher {
    use ink::prelude::string::String;
    use ink::H160;

    /// A simple token-like contract that emits Transfer events.
    /// Designed for integration with Triggr to watch and rexspond to "whale" transfers.
    
    #[ink(storage)]
    pub struct WhaleWatcher {
        threshold: Balance,
        paused: bool,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        pub source: H160,
        #[ink(topic)]
        pub recipient: H160,
        pub amount: Balance,
        pub message: Option<String>,
    }

    #[ink(event)]
    pub struct ThresholdUpdated {
        pub old_value: Balance,
        pub new_value: Balance,
        pub updated_by: H160,
    }

    #[ink(event)]
    pub struct Paused {
        pub paused_by: H160,
    }

    #[ink(event)]
    pub struct Unpaused {
        pub resumed_by: H160,
    }

    impl WhaleWatcher {
        /// Initialize the contract with an initial threshold.
        #[ink(constructor)]
        pub fn new(initial_threshold: Balance) -> Self {
            Self {
                threshold: initial_threshold,
                paused: false,
            }
        }

        /// Send a transfer and emit a `Transfer` event.
        ///
        /// This simulates a token transfer; it's just for demo purposes.
        #[ink(message)]
        pub fn transfer(
            &mut self,
            recipient: H160,
            amount: Balance,
            message: Option<String>,
        ) {
            assert!(!self.paused, "Contract is paused");

            let caller = self.env().caller();

            // Emit a Transfer event
            self.env().emit_event(Transfer {
                source: caller,
                recipient,
                amount,
                message,
            });
        }

        /// Update the whale detection threshold.
        #[ink(message)]
        pub fn update_threshold(&mut self, new_value: Balance) {
            assert!(!self.paused, "Contract is paused");

            let old = self.threshold;
            self.threshold = new_value;

            self.env().emit_event(ThresholdUpdated {
                old_value: old,
                new_value,
                updated_by: self.env().caller(),
            });
        }

        /// Pause the contract (no transfers or updates allowed).
        #[ink(message)]
        pub fn pause(&mut self) {
            self.paused = true;
            self.env().emit_event(Paused {
                paused_by: self.env().caller(),
            });
        }

        /// Resume the contract.
        #[ink(message)]
        pub fn unpause(&mut self) {
            self.paused = false;
            self.env().emit_event(Unpaused {
                resumed_by: self.env().caller(),
            });
        }

        /// Returns the current threshold.
        #[ink(message)]
        pub fn get_threshold(&self) -> Balance {
            self.threshold
        }

        /// Returns whether the contract is paused.
        #[ink(message)]
        pub fn is_paused(&self) -> bool {
            self.paused
        }
    }
}
