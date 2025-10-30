# ⚡️ Triggr TypeScript SDK

> Official TypeScript SDK for interacting with [Triggr](https://triggr.cloud) — the realtime, event-driven backend for Web3 applications.  
> Build apps that react to **on-chain events** and **sync data instantly** across clients, just like Firebase — but decentralized.

---

## 🚀 Features

- 🔑 Simple API-key authentication  
- ⚡ Realtime database updates via WebSockets  
- 📦 REST API for CRUD operations  
- 🔄 Listen to changes on individual documents or collections  
- 🌍 Built for multi-chain and Web3 native apps  

---

## 🧩 Installation

```bash
npm install triggr-ts-sdk
```

or

```bash
yarn add triggr-ts-sdk
```

## 🪄 Quick Start

```ts
import { TriggrSDK } from "triggr-ts-sdk";

async function main() {
  // Initialize with your API key
  const triggr = new TriggrSDK({
    apiKey: "YOUR_API_KEY_HERE",
  });

  // Connect to realtime WebSocket
  await triggr.connect();

  // Insert a new document
  await triggr.insertDocument("users", {
    id: "u123",
    name: "Alice",
    balance: 50,
  });

  // Listen for realtime changes
  triggr.onDocumentChange("users", "u123", (doc) => {
    console.log("User updated:", doc);
  });

  // Update a document
  await triggr.setDocument("users", {
    id: "u123",
    balance: 60,
  });
}

main();
```

## 🧰 Available Methods
| Method | Description |
|--------|--------------|
| `connect()` | Connect to the realtime WebSocket |
| `disconnect()` | Close the WebSocket connection |
| `insertDocument(collection, data)` | Create a new document |
| `setDocument(collection, data)` | Create or update a document by ID |
| `getDocument(collection, id)` | Retrieve a document |
| `listDocuments(collection)` | List all documents in a collection |
| `deleteDocument(collection, id)` | Delete a document |
| `onDocumentChange(collection, id, handler)` | Listen to a single document’s changes |
| `onCollectionChange(collection, handler)` | Listen to all changes in a collection |
| `offDocumentChange(...)` | Stop listening to document changes |
| `offCollectionChange(...)` | Stop listening to collection changes |


## 🔐 Authentication

Triggr uses API keys to authenticate your project.
You can create or manage keys from your [Triggr Console](https://console.triggr.cloud).

Example:

```js
const triggr = new TriggrSDK({
  apiKey: "YOUR_API_KEY_HERE",
});
```

## 🧑‍💻 Developer Notes

- TypeScript-ready out of the box

- No configuration needed — just plug in your API key

- Works seamlessly with modern frameworks (Next.js, React, Vue, etc.)

- Fully promise-based API

---

Web3 developers can have nice things 😊.

Copyright &copy; 2025 Algorealm, Inc.