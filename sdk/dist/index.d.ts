export type EventHandler<T = WsPayload> = (payload: T) => void;
export interface ApiKeyResponse {
    projectId: string;
    key: string;
}
export interface WsPayload {
    op: string;
    topic: string;
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
export declare class TriggrSDK {
    private options;
    private api;
    private ws?;
    private eventHandlers;
    private readonly baseURL;
    constructor(options: TriggrSDKOptions);
    connect(): Promise<void>;
    disconnect(): void;
    insertDocument(collection: string, data: any): Promise<any>;
    setDocument(collection: string, data: any): Promise<void>;
    getDocument(collection: string, id: string): Promise<any>;
    listDocuments(collection: string): Promise<any[]>;
    deleteDocument(collection: string, id: string): Promise<void>;
    onDocumentChange(collection: string, id: string, handler: EventHandler): void;
    offDocumentChange(collection: string, id: string, handler: EventHandler): void;
    onCollectionChange(collection: string, handler: EventHandler): void;
    offCollectionChange(collection: string, handler: EventHandler): void;
    on(event: string, handler: EventHandler): void;
    private off;
    private emit;
}
export {};
//# sourceMappingURL=index.d.ts.map