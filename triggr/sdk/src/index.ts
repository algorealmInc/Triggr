// Copyright (c) 2025, Algorealm Inc.

import WebSocket from "ws";
import axios, { AxiosInstance } from "axios";

export type EventHandler<T = WsPayload> = (payload: T) => void;

export interface ApiKeyResponse {
    projectId: string;
    key: string;
}

/// JSON structure returned from server
export interface WsPayload {
    /// Type of operation performed
    op: String,
    /// Broadcast topic
    topic: String,
    /// Document affected (old copy on delete)
    doc: Doc,
}

export interface Doc {
    /** The unique document ID within its collection. */
    id: string;

    /** The actual JSON payload of the document. */
    data: any; // could be Record<string, unknown> if you want stricter typing

    /** Optional metadata (timestamps, versioning, etc). */
    metadata?: DocMetadata;
}

export interface DocMetadata {
    /** When the document was created (unix timestamp). */
    created_at: number;

    /** Last time the document was updated (unix timestamp). */
    updated_at?: number;

    /** Optional version number for optimistic concurrency control. */
    version: number;

    /** Arbitrary tags for filtering/grouping (e.g. ["draft", "archived"]). */
    tags: string[];
}

interface TriggrSDKOptions {
    baseURL: string;
    apiKey: string;
}

export class TriggrSDK {
    private api: AxiosInstance;
    private ws?: WebSocket;
    private eventHandlers: Map<string, Set<EventHandler>> = new Map();

    constructor(private options: TriggrSDKOptions) {
        // Immediately configure REST API
        this.api = axios.create({
            baseURL: options.baseURL,
            headers: { "x-api-key": options.apiKey },
        });
    }

    // Connect to the realtime WebSocket
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const url = new URL(this.options.baseURL);
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
            url.pathname = "/ws";

            this.ws = new WebSocket(url.toString(), {
                headers: { "x-api-key": this.options.apiKey },
            });

            this.ws.on("open", () => {
                console.log("✅ WebSocket connected");
                this.emit("connected", {});
                resolve();
            });

            this.ws.on("close", () => {
                console.warn("⚠️ WebSocket disconnected");
                this.emit("disconnected", {});
            });

            this.ws.on("error", (err: any) => {
                console.error("❌ WebSocket error:", err);
                this.emit("error", err);
                reject(err);
            });

            this.ws.on("message", (data: { toString: () => string }) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.topic && msg.doc) {
                        this.emit(msg.topic, msg.doc);
                    }
                } catch (e) {
                    console.error("Failed to parse WS message:", e);
                }
            });
        });
    }

    // Close realtime connection 
    disconnect(): void {
        this.ws?.close();
    }

    // Http API

    // Create a new document
    async insertDocument(collection: string, data: any): Promise<any> {
        const res = await this.api.post(`/api/db/collections/${collection}/docs`, { id: data.id, data });
        return res.data;
    }

    // Create or update (replace) a document by ID
    async setDocument(collection: string, data: any): Promise<void> {
        await this.api.put(`/api/db/collections/${collection}/docs/${data.id}`, { id: data.id, data });
        this.emit(`document:${collection}:${data.id}:insert`, { collection, id: data.id, data });
    }

    // Read a single document
    async getDocument(collection: string, id: string): Promise<any> {
        const res = await this.api.get(`/api/db/collections/${collection}/docs/${id}`);
        return res.data;
    }

    // List all documents in a collection
    async listDocuments(collection: string): Promise<any[]> {
        const res = await this.api.get<any[]>(`/api/db/collections/${collection}/docs`);
        return res.data;
    }

    // Delete a document
    async deleteDocument(collection: string, id: string): Promise<void> {
        await this.api.delete(`/api/db/collections/${collection}/docs/${id}`);
        this.emit(`document:${collection}:${id}:delete`, { collection, id });
    }

    // Websocket 

    // Listen to changes on a single document
    onDocumentChange(collection: string, id: string, handler: EventHandler): void {
        const event = `document:${collection}:${id}:change`;
        this.on(event, handler);

        this.ws?.send(JSON.stringify({ data: `subscribe:${event}` }));
    }

    offDocumentChange(collection: string, id: string, handler: EventHandler): void {
        const event = `document:${collection}:${id}:change`;
        this.off(event, handler);

        if (!this.eventHandlers.get(event)?.size) {
            this.ws?.send(JSON.stringify({ data: `unsubscribe:${event}` }));
        }
    }

    // Listen to all changes in a collection
    onCollectionChange(collection: string, handler: EventHandler): void {
        const event = `collection:${collection}:change`;
        this.on(event, handler);

        this.ws?.send(JSON.stringify({ data: `subscribe:${event}` }));
    }

    offCollectionChange(collection: string, handler: EventHandler): void {
        const event = `collection:${collection}:change`;
        this.off(event, handler);

        if (!this.eventHandlers.get(event)?.size) {
            this.ws?.send(JSON.stringify({ data: `unsubscribe:${event}` }));
        }
    }

    // Events

    on(event: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
    }

    private off(event: string, handler: EventHandler): void {
        this.eventHandlers.get(event)?.delete(handler);
    }

    private emit(event: string, payload: any): void {
        this.eventHandlers.get(event)?.forEach((handler) => handler(payload));
    }
}
