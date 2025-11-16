
# ⚡️ Triggr - A Reactive Backend For Building Real-time Dapps.

The only way blockchains communicate naturally and in real time it by emitting events. Events are a powerful construct in blockchains because they serve as an interface to the outside world. They inform the outside world about important state changes happening on chain. (Everyday) Applications have found ways to know about state changes happening onchain through indexing, polling, or even tediously connecting and listening through websockets (and handling its failures). Using websockets, application have to listen, filter, clean, then SCALE-decode (AND DEBUG!) the data from the chain, just to get the application to respond to some condition change. Worse still, you need to be quite technical to do all that. All that goes away with Triggr.

Triggr is a reactive backend that listens for onchain events and provides an easy interface for applications to specify actions to be performed (triggers) when onchain changes occur and are exposed by events. With Triggr, your application updates instantly whenever your smart contract emits an event — no polling, no delays, all in real time. Triggr eliminates any low-level indexing and polling of the chain. As a Polkadot developer, you need not worry about anything but your application business logic and what to do when state chainges occur in your contract.

---

### How Does It Work?

1. Write your contract using ink! or solidity and compile to generate your `contract.json` file.
1. Create a project on Triggr and upload your `contract.json` file. When you do this, Triggr automatically extracts the events for you and places it in a console for you to instruct it on what to do when our contract events are emitted.
1. Write your triggers in the console and deploy them. Events defined in your contract are always exposed in the console automatically for your trigger logic to use them.
1. Install the `TypeScript SDK` and react to state changes in real-time, in your application.
1. Enjoy reactive event-driven programming!

### Directory Structure
Triggr is deployed and available [online](https://triggr.cloud). It is all built in a monorepo:
- The **console** directory contains front-end code for the [Triggr console](https://console.triggr.cloud). It connects and send requests to the triggr node to perform various operations e.g create project, store triggers, modify database state etc.
- The **examples** directory contains an example of a complete front-end application completely built on Triggr. The example is explained below.
- The **sdk** directory contains a simple Typescript SDK to be used in your application to query Triggr and respond to state changes (due to chain events). It is deployed here on [npm](https://www.npmjs.com/package/triggr-ts-sdk).
- The **ui** direatory contains the front-end code for the Triggr landing page.
- The **triggr** directory contains the Rust code for the triggr node itself. It includes a webserver, a database, a DSL parser and executor, a connection to a contract chain etc.


## Architecture
Triggr consists on majorly 4 parts working together:
1. A webserver module to recieve incoming request from console and dapps.
1. A storage module that contains an embedded key-value datastore - `Sled` for application data storage.
1. A DSL parser and executor module to parse and execute triggers.
1. A chain module for connecting to Blockchains, listening, parsing, decoding, and serializing events.


### Diagram

### Technologies
- Rust i.e `scale-info`, `substrate-api-client`, `parity-scale-code`, `axum`, `sled` etc.
- React/Typescript for the UI.
- Contracts.json


## Triggers
Triggr has a very small but expressive rule language used to define how your database should make state changes when events are emitted.

There are **three core operations**:
1. **INSERT** – add new data to your database
2. **UPDATE** – modify an existing record
3. **DELETE** – remove a record

All comparisons between event parameters and constants are supported.

### Examples
These are `triggers` are written to modify database state when events are emitted. The events are always exposed automatically in the console. This is made possible throught the uploaded `contacts.json` file.

#### INSERT

```rust
/* Events defined in your contract */
  const events = [
    ValueChanged { from, value, message } 
    FundsDeposited { amount } 
    EscrowPaused { fee }
]

fn main(events) {
    /* No matter the event, insert the record */
    insert @users:tx1 {
        amount: events.ValueChanged.value,
        message: events.ValueChanged.message,
        status: "created"
    }
}
```

---

#### UPDATE

```rust
/* Events defined in your contract */
  const events = [
    ValueChanged { from, value, message }  
]

fn main(events) {
    if (events.ValueChanged.value > 200) {
        update @users:tx10 {
            amount: events.ValueChanges.value,
        }
    } else {
        delete @users:tx9
    }
   
}
```

---

#### DELETE

```rust
/* Events defined in your contract */
  const events = [
    ValueChanged { from, value, message }  
]

fn main(event) {
    if (events.ValueChanged.value > 200) {
        delete @users:tx1
    }
}
```

---

### How to Write Triggers
Triggers watch out for events that match their condition and execute the rules that was set e.g deleting a record.
Below are the four major patterns of writing triggers:

---

1. Using a Conditional i.e reacting to events with a condition:

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(event) {
    if (event.NftMinted.total_supply > 20000) {
        update @collection:doc_id {
            category: "high"
        }
    }
}   
```

---

2. No Conditionals i.e simple triggers without conditions, these are executed any time any event is emitted from your contract:

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(event) {
    /* Record NFT minting always */
    insert @collection:doc_id {
        total_supply: events.NftMinted.total_supply,
        amount: events.NftMinted.amount
    }
}  
```
---

3. Dynamic ID i.e letting Triggr assign the ID automatically. This is done by leaving out the `document id` after the colon `:`. Triggr understands this and will generate a `UUID` as the key for the record internally.

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(event) {
    /* Record NFT minting always */
    insert @collection: {
        total_supply: events.NftMinted.total_supply,
        amount: 49
    }
}  
```
---

4. Writing Event data directly into the database. Triggr is able to understand when real-time event data need to be stored:

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(event) {
    /* Record NFT minting always */
    insert @collection:doc_id {
        total_supply: events.NftMinted.total_supply,
        amount: events.NftMinted.amount
    }
}  
```

#### Rules for writing Triggers
1. A trigger must always be in a `main` function.
1. You cannot write more that one triggers at a time, except branching it out by using a conditional.

## Triggr SDK
Triggr SDK allows applications to easily send queries and react to state changes on Triggr (propelled directly by onchain events). The SDK is published on [npm](https://www.npmjs.com/package/triggr-ts-sdk) and is explained in detail [here](https://github.com/algorealmInc/Triggr/tree/main/sdk).

## Example

## Why Should Anyone Care?

- Build reactive applications without polling
- Simplify backend logic dramatically
- Automatically sync blockchain events to your database
- Real-time updates for any UI
- Works seamlessly with Substrate, Polkadot, and modern dApps
- Fast rule execution with predictable performance
- Designed for developers who want **power without complexity**

## Improvements and next steps 
1. The SCALE-decoding is not perfect. We will improve and perfect the scale decoding of event data so all contracts event can be parsed.
1. Triggr runs on a single centralized node. We will make it decentralized and synchronize the nodes using [SwarmNL].
1. We will make Triggr more generic to accomodate more chains e.g Ethereum
1. Make triggers more generic, powerful and capable e.g integration with telegram.

## Conclusion
Triggr is an incredibly useful platform that can speed up and simplify Web3 application developments. You can easily build real-time apps and worry only about your business logic and contract logic. Congratulations!

Web3 developers can have nice things 😊