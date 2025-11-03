"use strict";
// Copyright (c) 2025, Algorealm Inc.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggrSDK = void 0;
const axios_1 = __importDefault(require("axios"));
let WSImpl;
(async function () {
    if (typeof window !== "undefined") {
        // Browser
        WSImpl = WebSocket;
    }
    else {
        // Node
        // Dynamic import so TS won’t complain in browser builds
        WSImpl = (await Promise.resolve().then(() => __importStar(require("ws")))).default;
    }
})();
class TriggrSDK {
    options;
    api;
    ws;
    eventHandlers = new Map();
    baseURL = "https://api.triggr.cloud";
    constructor(options) {
        this.options = options;
        // Configure REST API automatically
        this.api = axios_1.default.create({
            baseURL: this.baseURL,
            headers: { "x-api-key": options.apiKey },
        });
    }
    // Connect to the realtime WebSocket
    async connect() {
        return new Promise((resolve, reject) => {
            const wsUrl = "wss://api.triggr.cloud/ws";
            this.ws = new WSImpl(wsUrl, {
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
            this.ws.on("error", (err) => {
                console.error("❌ WebSocket error:", err);
                this.emit("error", err);
                reject(err);
            });
            this.ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.topic && msg.doc) {
                        this.emit(msg.topic, msg.doc);
                    }
                }
                catch (e) {
                    console.error("Failed to parse WS message:", e);
                }
            });
        });
    }
    disconnect() {
        this.ws?.close();
    }
    // REST API operations
    async insertDocument(collection, data) {
        const metadata = {
            created_at: 0,
            version: 0,
            tags: []
        };
        const res = await this.api.post(`/api/db/collections/${collection}/docs`, { id: data.id, data, metadata });
        return res.data;
    }
    async setDocument(collection, data) {
        const metadata = {
            created_at: 0,
            version: 0,
            tags: []
        };
        await this.api.put(`/api/db/collections/${collection}/docs/${data.id}`, { id: data.id, data, metadata });
        this.emit(`document:${collection}:${data.id}:insert`, { collection, id: data.id, data });
    }
    async getDocument(collection, id) {
        const res = await this.api.get(`/api/db/collections/${collection}/docs/${id}`);
        return res.data;
    }
    async listDocuments(collection) {
        const res = await this.api.get(`/api/db/collections/${collection}/docs`);
        return res.data;
    }
    async deleteDocument(collection, id) {
        await this.api.delete(`/api/db/collections/${collection}/docs/${id}`);
        this.emit(`document:${collection}:${id}:delete`, { collection, id });
    }
    // WebSocket realtime events
    onDocumentChange(collection, id, handler) {
        const event = `document:${collection}:${id}:change`;
        this.on(event, handler);
        this.ws?.send(JSON.stringify({ data: `subscribe:${event}` }));
    }
    offDocumentChange(collection, id, handler) {
        const event = `document:${collection}:${id}:change`;
        this.off(event, handler);
        if (!this.eventHandlers.get(event)?.size) {
            this.ws?.send(JSON.stringify({ data: `unsubscribe:${event}` }));
        }
    }
    onCollectionChange(collection, handler) {
        const event = `collection:${collection}:change`;
        this.on(event, handler);
        this.ws?.send(JSON.stringify({ data: `subscribe:${event}` }));
    }
    offCollectionChange(collection, handler) {
        const event = `collection:${collection}:change`;
        this.off(event, handler);
        if (!this.eventHandlers.get(event)?.size) {
            this.ws?.send(JSON.stringify({ data: `unsubscribe:${event}` }));
        }
    }
    // Event handling helpers
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }
    off(event, handler) {
        this.eventHandlers.get(event)?.delete(handler);
    }
    emit(event, payload) {
        this.eventHandlers.get(event)?.forEach((handler) => handler(payload));
    }
}
exports.TriggrSDK = TriggrSDK;
//# sourceMappingURL=index.js.map