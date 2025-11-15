
# Welcome to Triggr

The only way blockchains communicated naturally and in real time it by emitting events. Events are a powerful construct in blockchains because they serve as an interface to the outside world. They inform the outside world about important state changes happening on chain. (Everyday) Applications have found ways to know about state changes happening onchain through indexing, polling, or even tediously connecting and listening trough websockets. All to get the application to respond to some condition change. That is exactly why Triggr is built.

Triggr is a reactive backend that listens for onchain events and provides an easy interface for applications to specify actions to be performed when these onchain changes occur and we are notified by events. With Triggr, your application updates instantly whenever your smart contract emits an event — no polling, no delays, all in real time. Triggr eliminates indexing and polling of the chain, just to make state changes to your application. As a Polkadot developer, you need not worry about anythibg but your application business logic and what to do when state chainges occur in your contract.

---

## How Does It Work?

1. Write your contract using ink! or solidity and compile to generate your `contract.json` file.
1. Create a project on Triggr and upload your `contract.json` file. When you do this, Triggr automatically extracts the events for you and places it in a console for you to instruct it on what to do when thos events occur.
1. Write your triggers in the console and deploy them. Events defined in the contracts file are always exposed in the console automatically for your trigger logic to use them.
1. Install the `TypeScript SDK` and react to state changes in your application.
1. Enjoy reactive event-driven programming!

---

# Triggr DSL

Triggr has a very small but expressive rule language used to define how your database should change when events are emitted.

There are **three core operations**:

1. **INSERT** – add new data to your database
2. **UPDATE** – modify an existing record
3. **DELETE** – remove a record

All comparisons between event parameters and constants are supported.

---

# DSL Examples

## INSERT Example

fn main(event) {
insert @id {
amount: 5000,
status: "created"
}
}

---

## UPDATE Example

```rust
fn main(event) {
    if (event.amount > 1000) {
        update @id {
            status: "large"
        }
    }
}
```

---

## DELETE Example

```rust
fn main(event) {
    if (event.flag == false) {
        delete @id
    }
}
```

---

# How to Write DSL

Below are four common patterns.

---

## 1. Using a Conditional

Reacting to events with a condition:

```rust
fn main(event) {
    if (event.value > 20000) {
        insert @id {
            category: "high"
        }
    }
}   
```

---

## 2. No Conditionals

Simple triggers without conditions:

```rust
fn main(event) {
    insert @id {
        account: event.account,
        amount: 100
    }
}
```
---

## 3. Dynamic ID

Let Triggr assign the ID automatically:

```rust
fn main(event) {
    insert {
        source: event.source,
        timestamp: event.timestamp
    }
}
```
---

## 4. Writing Event Data to Storage

Store event fields directly into the database:

```rust
fn main(event) {
    update @id {
        sender: event.sender,
        recipient: event.recipient,
        transferred: event.amount
    }
}
```

---

# Why Use Triggr?

- Build reactive applications without polling
- Simplify backend logic dramatically
- Automatically sync blockchain events to your database
- Real-time updates for any UI
- Works seamlessly with Substrate, Polkadot, and modern dApps
- Fast rule execution with predictable performance
- Designed for developers who want **power without complexity**

---

# GitHub

Coming soon…
