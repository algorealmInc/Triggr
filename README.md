
<img src="https://github.com/algorealmInc/Triggr/blob/main/public/logo.png" style="max-height: 200px">

# ⚡️ Triggr — A Reactive Backend for Real-Time Dapps

Blockchains communicate with the outside world **through events**. Events signal important state changes happening on-chain.

But today, applications typically learn about these changes through:

- complex indexing pipelines  
- slow polling  
- fragile websocket listeners  
- manual filtering and SCALE decoding  
- constant debugging and upkeep  

It’s slow, tedious, and highly technical.

**Triggr removes all of that.**

Triggr is a **reactive backend** that listens for on-chain events and lets you declare simple *triggers* — instructions that run automatically whenever your smart contract emits an event. Your app receives updates instantly, with **no polling**, **no indexers**, and **zero blockchain boilerplate**.

As a Polkadot developer, you focus entirely on **your business logic**, not decoding bytes or running infrastructure.

### 🚀 How Triggr Works

1. **Write your smart contract** in ink! or Solidity.  
   Compile it to generate your `contracts.json` file.

2. **Create a Triggr project**, then upload your `contracts.json`.  
   Triggr automatically extracts all contract events and displays them in the console.

3. **Write your triggers** in the console.  
   These define what should happen in your storage whenever an event is emitted.

4. **Install the TypeScript SDK** and subscribe to real-time updates in your dapp.

5. **Enjoy fully reactive, event-driven programming** — without managing nodes, websockets, indexing pipelines, or decoding logic.


### Directory Structure

Triggr is deployed and available online at **https://triggr.cloud**.  
The entire platform is built in a **monorepo** with the following structure:

- **console/**  
  Front-end code for the [Triggr Console](https://console.triggr.cloud).  
  This UI connects to the Triggr node to:
  - create and manage projects  
  - upload contracts  
  - write and deploy triggers  
  - inspect storage  
  - manage events and state  

- **examples/**  
  A complete example dapp built entirely on Triggr.  
  Shows how to use events → triggers → frontend updates end-to-end.

- **sdk/**  
  The TypeScript SDK used by applications to:
  - subscribe to real-time collection changes  
  - query the Triggr backend  
  - react to contract events automatically  
  Published on NPM: https://www.npmjs.com/package/triggr-ts-sdk

- **ui/**  
  Front-end code for the Triggr landing page and marketing website.

- **triggr/**  
  The core Triggr node, written in Rust.  
  Contains:
  - the webserver  
  - storage engine  
  - DSL parser + executor  
  - blockchain connector  
  - internal queue + event router  

---

## Architecture

Triggr is built from **four core components** that work together seamlessly:

1. **Webserver Module**  
   Handles incoming HTTP/WebSocket requests from:
   - the console  
   - your dapps  
   - the SDK  
   It exposes APIs, triggers execution, and streams real-time updates.

2. **Storage Module**  
   A fast, embedded key-value store powered by **Sled**.  
   Used to store:
   - user data  
   - trigger outputs  
   - application state  
   - event logs (optional)  

3. **DSL Parser & Executor**  
   Parses your trigger scripts and executes them whenever events occur.  
   This module is responsible for:
   - validating your DSL  
   - reading event fields  
   - performing `insert`, `update`, and `delete` operations  
   - writing changes to storage  

4. **Chain Module**  
   Connects to supported blockchains and:
   - listens for contract events  
   - fetches and decodes SCALE data  
   - serializes event fields into readable structures  
   - sends events to the DSL executor in real-time  

Together, these components turn raw blockchain events into **instant, structured updates** for your application—without indexing, polling, or manual decoding.


### Diagram
<img src="https://github.com/algorealmInc/Triggr/blob/main/public/triggr-arch.png">

### Technologies
- Rust i.e `scale-info`, `substrate-api-client`, `parity-scale-code`, `axum`, `sled` etc.
- React/Typescript for the UI.
- Contracts.json
- Clerk Auth (Dev) for console auth.


## Triggers
Triggr has a very small but expressive rule language used to define how your database should make state changes when events are emitted.

There are **three core operations**:
1. **INSERT** – add new data to your database
2. **UPDATE** – modify an existing record
3. **DELETE** – remove a record

All comparisons between event parameters and constants are supported.

### Examples
Below are `triggers` written to modify database state when events are emitted. The events are always exposed automatically in the console. This is made possible through the uploaded `contacts.json` file.

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

fn main(events) {
    if (events.ValueChanged.value > 200) {
        delete @users:tx1
    }
}
```

---

### How to Write Triggers
Triggers watch out for events that match their condition and execute the rules that was set e.g deleting a record.
Below are the four major patterns of writing triggers:

1. Using a Conditional i.e reacting to events with a condition:

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(events) {
    /* Execute trigger only when total_supply is greater than 2000 */
    if (event.NftMinted.total_supply > 20000) {
        update @collection:doc_id {
            category: "high"
        }
    }
}   
```

2. No Conditionals i.e simple triggers without conditions. These are executed any time any event is emitted from your contract:

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(events) {
    /* Record NFT minting always */
    insert @collection:doc_id {
        total_supply: events.NftMinted.total_supply,
        amount: events.NftMinted.amount
    }
}  
```

3. Dynamic ID i.e letting Triggr assign the ID automatically. This is done by leaving out the `document id` after the colon `:`. Triggr understands this and will generate a `UUID` as the key for the record internally.

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(events) {
    /* Record NFT minting always */
    insert @collection: {
        total_supply: events.NftMinted.total_supply,
        amount: 49
    }
}  
```

4. Writing Event data directly into the database. Triggr is able to understand when real-time event data need to be stored. Here, it is important to make sure the event field is specified correctly as typographical errors would prevent the triggers from being fired:

```rust
/* Events defined in your contract */
  const events = [
    NftMinted { total_supply, amount }
]

fn main(events) {
    /* Record NFT minting always */
    insert @collection:doc_id {
        total_supply: events.NftMinted.total_supply,
        amount: events.NftMinted.amount
    }
}  
```

#### Rules for Writing Triggers
1. Every trigger must be written inside a `main` function.  
2. Only one `main` function is allowed in each trigger file.

---

## Triggr SDK
The Triggr SDK makes it easy for applications to send queries and react to real-time state changes originating from on-chain events.  
It is available on NPM:  
https://www.npmjs.com/package/triggr-ts-sdk

Documentation is here:  
https://github.com/algorealmInc/Triggr/tree/main/sdk

---

## Example

The **Demo** showcases the power of Triggr.  
A dummy contract emits events → triggers fire → database updates → front-end updates instantly.

**Data Flow:**  
`Contract Events → Triggers → Database Changes → Front-end Update`

Here’s how it works:

1. **Define the Contract**  
   The ink! contract emits events whenever the internal storage changes.  
   View the contract here:  
   https://github.com/algorealmInc/Triggr/blob/main/examples/demo/contract/lib.rs

2. **Deploy the Contract**  
   The demo contract is deployed on PassetHub:  
   `0x25b322C78C16E0A20DCebECAAef82A0a2976624b`  
   You can call it live using the Contracts UI:  
   https://ui.use.ink/contract/0x25b322C78C16E0A20DCebECAAef82A0a2976624b

3. **Create a Project on Triggr**  
   Upload the generated `contracts.json` file.  
   Triggr extracts events automatically and displays them in the console.

   <img src="https://github.com/algorealmInc/Triggr/blob/main/public/triggr-shot-1.png">

4. **Write Your Triggers**  
   Events from the contract appear automatically in the console.  
   Here is a trigger that writes to the database whenever `ValueChanged` is emitted:

   <img src="https://github.com/algorealmInc/Triggr/blob/main/public/triggr-shot-2.png">

   ```rust
   /* Events defined in your contract */
     const events = [
       ValueChanged { from, value, message }  
   ]

   fn main(events) {
       /* Insert into the transactions collection and generate ID */
       insert @transactions: with {
           from: events.ValueChanged.from,
           value: events.ValueChanged.value,
           message: events.ValueChanged.message
       }
   }

5. **Emit Events**

Go to the **Contracts UI** and call the `increment` function.  
This action emits the **ValueChanged** event.  
(Ensure your account has sufficient **PAS** balance.)

<img src="https://github.com/algorealmInc/Triggr/blob/main/public/triggr-shot-4.png">

6. **Database Updates Automatically**

Once the event is emitted, your deployed trigger executes immediately, and the Triggr database updates in real time.

<img src="https://github.com/algorealmInc/Triggr/blob/main/public/triggr-shot-5.png">

7. **Done!**

Your on-chain event updated the database, and the Triggr SDK pushed the new data to your front-end instantly.  
No indexing. No polling. No delays. No complexity.

**It’s that simple — and it feels like magic. ✨**


#### Demo Links
1. [Contracts UI](https://ui.use.ink/contract/0x25b322C78C16E0A20DCebECAAef82A0a2976624b)
2. [Contracts.json](https://github.com/algorealmInc/Triggr/blob/main/examples/demo/contract/event_demo.json) file
2. [Deployed front-end](https://demo.triggr.cloud)
## Why Should Anyone Care?

- Build reactive applications without any polling  
- Drastically simplify backend logic  
- Automatically sync blockchain events into your database  
- Real-time UI updates out of the box  
- Works seamlessly with Substrate, Polkadot, and modern dApps  
- Fast, predictable rule execution  
- Built for developers who want **power without complexity**

---

## Improvements & Next Steps

1. **Perfect SCALE decoding**  
   We will refine our event decoding so every contract event can be parsed reliably with zero errors.

2. **Decentralize Triggr nodes**  
   Currently, Triggr runs on a single node. We will make it decentralized and synchronize nodes using [SwarmNL](https://github.com/algorealmInc/SwarmNL).

3. **Support more chains**  
   Triggr will become more generic and support additional ecosystems such as **Ethereum**.

4. **More powerful triggers**  
   We will introduce richer integrations (e.g., Telegram), front-end modification hooks, and more expressive trigger logic.

---

## Conclusion

Triggr is a powerful platform that accelerates and simplifies Web3 development.  
You can now build real-time applications effortlessly and focus entirely on your business logic and smart contracts.

Web3 developers can finally have nice things 😊.

**Copyright (c) 2025 Algorealm, Inc.**
