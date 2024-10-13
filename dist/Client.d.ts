import { EverEmitter } from "everemitter";
import { Upload } from "./Upload";
import { Response } from "./Response";
import { Subscription } from "./Subscription";
import { Emitter } from "./Emitter";
interface Endpoint {
    params: Record<string, any> | null;
    result: any;
}
type EndpointRecord = Record<string, Endpoint>;
type EndpointParams<V extends EndpointRecord> = Partial<{
    [K in keyof V]: V[K]["params"];
}>;
type EndpointResult<V extends EndpointRecord, P> = {
    [K in keyof P]: K extends keyof V ? V[K]["result"] : never;
};
export type EndpointInput = Record<string, Record<string, any> | null | undefined>;
type ClientSignatures = {
    init: () => any;
    deinit: () => any;
    request: (endpoints: EndpointInput, emitter: Emitter) => any;
    subscribe: (endpoint: EndpointInput, emitter: Emitter) => any;
};
export declare class Client<T extends EndpointRecord = {}, U extends EndpointRecord = {}> extends EverEmitter<ClientSignatures> {
    private readonly url;
    private readonly wsUrl;
    private readonly fetch;
    private readonly WebSocket;
    private readonly FormData;
    private headers;
    private ws;
    private subscriptions;
    private subscriptionKey;
    private messages;
    constructor({ url, wsUrl, fetch, WebSocket, FormData, }: {
        url: string;
        wsUrl: string;
        fetch: typeof globalThis.fetch;
        WebSocket: typeof globalThis.WebSocket;
        FormData: typeof globalThis.FormData;
    });
    update(headers: Record<string, string> | null): void;
    init(): void;
    deinit(): void;
    request<P extends EndpointParams<T>>(endpoints: P): Promise<Response<EndpointResult<T, P>>>;
    parseRequestEndpoints(value: any, uploads: Map<number, Upload>): any;
    openWebSocket(): void;
    send(subscriptionKey: number, endpoint: EndpointInput | null): void;
    sendAll(): void;
    setSubscription(subscriptionKey: number, subscription: Subscription<{}>): void;
    deleteSubscription(subscriptionKey: number): void;
    subscribe<P extends EndpointParams<U>>(endpoint: P): Subscription<EndpointResult<U, P>>;
    subscribeAll(): void;
}
export {};
