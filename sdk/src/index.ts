// Copyright (c) 2025, Algorealm Inc.

import axios, { AxiosInstance } from "axios";

export type EventHandler<T = WsPayload> = (payload: T) => void;

export interface ApiKeyResponse {
    projectId: string;
    key: string;
}

/// JSON structure returned from server
export interface WsPayload {
    /// Type of operation performed
    op: string;
    /// Broadcast topic
    topic: string;
    /// Document affected (old copy on delete)
    doc: Doc;
}

export interface Doc {
    /** The unique document ID within its collection. */
    id: string;

    /** The actual JSON payload of the document. */
    data: any;

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
    apiKey: string;
}

export class TriggrSDK {
    private api: AxiosInstance;
    private ws?: any;
    private eventHandlers: Map<string, Set<EventHandler>> = new Map();
    private readonly baseURL = "https://api.triggr.cloud";

    constructor(private options: TriggrSDKOptions) {
        // Configure REST API automatically
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: { "x-api-key": options.apiKey },
        });
    }

    // Connect to the realtime WebSocket
    async connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const url = new URL(this.baseURL);
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
            url.pathname = "/ws";
            url.searchParams.set("api_key", this.options.apiKey);

            // For browser
            if (typeof window !== "undefined") {
                // Browser: use query param
                this.ws = new WebSocket(url.toString());
            } else {
                // Node.js
                const { default: WSImpl } = await import("ws");
                this.ws = new WSImpl(url.toString(), {
                    headers: { "x-api-key": this.options.apiKey },
                });
            }

            this.ws.onopen = () => {
                console.log("✅ WebSocket connected");
                this.emit("connected", {});
                resolve();
            };

            this.ws.onclose = () => {
                console.warn("⚠️ WebSocket disconnected");
                this.emit("disconnected", {});
            };

            this.ws.onerror = (err: any) => {
                console.error("❌ WebSocket error:", err);
                this.emit("error", err);
                reject(err);
            };

            this.ws.onmessage = (event: { data: string; }) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.topic && msg.doc) {
                        this.emit(msg.topic, msg.doc);
                    }
                } catch (e) {
                    console.error("Failed to parse WS message:", e);
                }
            };
        });
    }

    disconnect(): void {
        this.ws?.close();
    }

    // REST API operations
    async insertDocument(collection: string, data: any): Promise<any> {
        const metadata: DocMetadata = {
            created_at: 0,
            version: 0,
            tags: []
        };

        const res = await this.api.post(`/api/db/collections/${collection}/docs`, { id: data.id, data, metadata });
        return res.data;
    }

    async setDocument(collection: string, data: any): Promise<void> {
        const metadata: DocMetadata = {
            created_at: 0,
            version: 0,
            tags: []
        };

        await this.api.put(`/api/db/collections/${collection}/docs/${data.id}`, { id: data.id, data, metadata });
        this.emit(`document:${collection}:${data.id}:insert`, { collection, id: data.id, data });
    }

    async getDocument(collection: string, id: string): Promise<any> {
        const res = await this.api.get(`/api/db/collections/${collection}/docs/${id}`);
        return res.data;
    }

    async listDocuments(collection: string): Promise<any[]> {
        const res = await this.api.get<any[]>(`/api/db/collections/${collection}/docs`);
        return res.data;
    }

    async deleteDocument(collection: string, id: string): Promise<void> {
        await this.api.delete(`/api/db/collections/${collection}/docs/${id}`);
        this.emit(`document:${collection}:${id}:delete`, { collection, id });
    }

    // WebSocket realtime events
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

    // Event handling helpers
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
