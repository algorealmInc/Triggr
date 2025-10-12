// Apache 2.0 License
// Copyright (c) 2025, Algorealm Inc.

import { SamaritanSDK } from ".";

async function main() {
    // Create SDK instance
    const sdk = new SamaritanSDK({
        baseURL: "http://localhost:5190",
        apiKey: "fdkjfnn"
    });

    // Connect to realtime server
    await sdk.connect();

    // Handle connection events
    sdk.on("connected", () => {
        console.log("✅ Realtime connected");
    });

    sdk.on("disconnected", () => {
        console.log("❌ Realtime disconnected");
    });

    // Subscribe to collection changes
    sdk.onCollectionChange("users", (payload) => {
        console.log("📦 Collection event:", payload);
    });

    // Subscribe to a specific document
    sdk.onDocumentChange("users", "12345", (payload) => {
        console.log("📄 Document event:", payload);
    });

    // Insert a document
    await sdk.insertDocument("users", {
        id: "12345",
        name: "Alice",
        email: "alice@example.com",
    });

    // Update a document
    // await sdk.setDocument("users", {
    //     id: "12345",
    //     name: "Alice Wonderland",
    //     email: "alice@wonderland.com",
    // });

    // Delete a document
    // await sdk.deleteDocument("users", "12345");

    // List all documents
    const users = await sdk.listDocuments("users");
    console.log("All users:", users);
}

main().catch(console.error);
