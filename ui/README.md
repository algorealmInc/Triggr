# Welcome to Triggr

Triggr is a reactive backend used to build real-time decentralized applications.  
With Triggr, your application updates instantly whenever your smart contract emits an event — no polling, no delays.

---

## How Does It Work?

1. **Write your contract** and define the events your application should react to.
2. **Upload your contract and publish it** on PassetHub using the Contracts UI.
3. **Create a Triggr account** and set up a project.
4. **Write triggers** to react and update your database whenever the blockchain emits an event.
5. **Install the TypeScript SDK** and integrate it into your frontend/backend.
6. **Enjoy reactive event-driven programming!**

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
