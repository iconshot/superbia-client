import { EverEmitter } from "everemitter";
import { Client, EndpointInput } from "./Client";
import { EmitterSignatures } from "./Emitter";
export declare class Subscription<R> extends EverEmitter<EmitterSignatures<R>> {
    private readonly client;
    private readonly subscriptionKey;
    private readonly endpoint;
    constructor(client: Client, subscriptionKey: number, endpoint: EndpointInput);
    subscribe(): void;
    unsubscribe(): void;
}
