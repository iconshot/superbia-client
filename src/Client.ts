import { EverEmitter } from "everemitter";

import { Upload } from "./Upload";
import { Response, ResponseResult, ServerResponse } from "./Response";
import { Subscription } from "./Subscription";
import { Emitter } from "./Emitter";

export interface Pagination<K> {
  nodes: K[];
  hasNextPage: boolean;
  nextPageCursor: string | null;
}

export type Result<T> = T extends null
  ? null
  : T extends (infer U)[]
  ? Result<U>[]
  : T extends object
  ? { [K in keyof T]: Result<T[K]> } & { _typename: string }
  : T;

export interface Endpoint {
  params: Record<string, any> | null;
  result: any;
}

export type EndpointRecord = Record<string, Endpoint>;

type EndpointParams<V extends EndpointRecord> = Partial<{
  [K in keyof V]: V[K]["params"];
}>;

type EndpointResult<V extends EndpointRecord, P> = {
  [K in keyof P]: K extends keyof V ? Result<V[K]["result"]> : never;
};

export type EndpointInput = Record<
  string,
  Record<string, any> | null | undefined
>;

type ClientSignatures = {
  init: () => any;
  deinit: () => any;
  request: (endpoints: EndpointInput, emitter: Emitter<ResponseResult>) => any;
  subscribe: (endpoint: EndpointInput, emitter: Emitter<ResponseResult>) => any;
};

export class Client<
  T extends EndpointRecord = {},
  U extends EndpointRecord = {}
> extends EverEmitter<ClientSignatures> {
  private readonly url: string;
  private readonly wsUrl: string;

  private readonly fetch: typeof globalThis.fetch;

  private readonly WebSocket: typeof globalThis.WebSocket;
  private readonly FormData: typeof globalThis.FormData;

  private headers: Record<string, string> | null = null;

  private ws: WebSocket | null = null; // websocket

  private subscriptions: Map<number, Subscription<ResponseResult>> = new Map();

  private subscriptionKey: number = 0;

  /*

  a messages stack is needed so we can call subscribe() before the ws connection has been opened

  more on the send() comments

  */

  private messages: {
    subscriptionKey: number;
    endpoint: EndpointInput | null;
  }[] = [];

  constructor({
    url,
    wsUrl,
    fetch,
    WebSocket,
    FormData,
  }: {
    url: string;
    wsUrl: string;
    fetch: typeof globalThis.fetch;
    WebSocket: typeof globalThis.WebSocket;
    FormData: typeof globalThis.FormData;
  }) {
    super();

    this.url = url;
    this.wsUrl = wsUrl;

    // same apis for node and browser

    this.fetch = fetch;
    this.WebSocket = WebSocket;
    this.FormData = FormData;
  }

  public update(headers: Record<string, string> | null): void {
    this.headers = headers;
  }

  public init(): void {
    if (this.ws !== null) {
      this.ws.onclose = (): void => {
        this.openWebSocket();
      };

      this.ws.close();
    } else {
      this.openWebSocket();
    }
  }

  public deinit(): void {
    if (this.ws !== null) {
      this.ws.onclose = null;

      this.ws.close();
    }

    this.ws = null;

    this.emit("deinit");
  }

  public async request<P extends EndpointParams<T>>(
    endpoints: P
  ): Promise<EndpointResult<T, P>> {
    const { fetch, FormData } = this;

    const emitter = new Emitter();

    this.emit("request", endpoints, emitter);

    const uploads = new Map<number, Upload>();

    // parse in search of uploads

    const parsed = this.parseRequestEndpoints(endpoints, uploads);

    const body = new FormData(); // fetch body

    body.append("endpoints", JSON.stringify(parsed));

    // append uploads to body, if any

    uploads.forEach((upload, uploadKey): void => {
      body.append(`${uploadKey}`, upload.blob, upload.name ?? undefined);
    });

    const options: RequestInit = { method: "POST", body }; // fetch options

    if (this.headers !== null) {
      options.headers = this.headers;
    }

    try {
      const fetchResponse = await fetch(this.url, options);

      const json: ServerResponse = await fetchResponse.json();

      const response = new Response<EndpointResult<T, P>>(json);

      emitter.emit("response", response);

      const result = response.result()!;

      emitter.emit("success"); // consistent with subscription

      emitter.emit("result", result);

      return result;
    } catch (error: any) {
      emitter.emit("error", error);

      throw error;
    }
  }

  private parseRequestEndpoints(value: any, uploads: Map<number, Upload>): any {
    if (value === null) {
      return null;
    }

    if (value instanceof Upload) {
      const uploadKey = uploads.size;

      uploads.set(uploadKey, value);

      return { uploadKey };
    }

    if (Array.isArray(value)) {
      return value.map((tmpValue): any =>
        this.parseRequestEndpoints(tmpValue, uploads)
      );
    }

    if (typeof value === "object") {
      const tmpValue: Record<string, any> = {};

      for (const key in value) {
        tmpValue[key] = this.parseRequestEndpoints(value[key], uploads);
      }

      return tmpValue;
    }

    return value;
  }

  private openWebSocket(): void {
    const { WebSocket } = this;

    let url = this.wsUrl;

    if (this.headers !== null) {
      /*
      
      unlike fetch, WebSocket doesn't accept a "headers" option,
      so we pass the headers through the url

      */

      url += "?";

      url += Object.entries(this.headers)
        .map((entry): string => entry.map(encodeURIComponent).join("="))
        .join("&");
    }

    /*

    the call to subscribeAll() is useful because it will
    push to the stack all the messages from current subscriptions
    to the newly created this.ws connection

    */

    this.subscribeAll();

    const ws = new WebSocket(url);

    this.ws = ws;

    ws.onopen = (): void => {
      this.emit("init");

      /*

      since messages are only sent when the ws connection is open,
      we may have messages in the stack that need to be sent

      */

      this.sendAll();
    };

    ws.onmessage = (message: MessageEvent<string>): void => {
      const {
        subscriptionKey,
        response: json,
      }: { subscriptionKey: number; response: ServerResponse } = JSON.parse(
        message.data
      );

      const subscription = this.subscriptions.get(subscriptionKey);

      if (subscription === undefined) {
        return;
      }

      const response = new Response<ResponseResult>(json);

      subscription.emit("response", response);

      try {
        const result = response.result();

        if (result === null) {
          subscription.emit("success");
        } else {
          subscription.emit("result", result);
        }
      } catch (error: any) {
        subscription.emit("error", error);
      }
    };

    ws.onclose = (): void => {
      /*
        
        this can happen for multiple reasons: connection lost, server off, etc
  
        we try to reconnect
        
        */

      setTimeout((): void => {
        this.openWebSocket();
      }, 250);
    };
  }

  /*

  send() is called on every subscription.subscribe() call,
  but sendAll() won't send the messages until the ws is opened

  --
  
  scenario #1
  
    const client = new Client(...);

    client.init();

    client.subscribe({ hello: { world: "world"} });

  in this case, the subscription will add a new message to messages
  but it won't be sent yet

  it will take a few milliseconds for the ws connection to be opened

  once ws is open, the message will be sent
  because the ws.onopen handler calls sendAll() sending the message found in the stack

  --

  scenario #2

    const client = new Client(...);

    client.init();

    client.subscribe({ hello: { world: "world" } });

    setTimeout(() => {
      client.init();
    }, 5000);

  once we reach the timeout the message has already been sent

  the second init() call will close the current ws and will create a new one,
  openWebSocket() will call subscribeAll() which will re-add the message to stack,
  but we will wait for the new ws to be opened for the new message to be sent
  
  */

  public send(subscriptionKey: number, endpoint: EndpointInput | null): void {
    this.messages.push({ subscriptionKey, endpoint });

    this.sendAll();
  }

  private sendAll(): void {
    const { WebSocket } = this;

    if (this.ws === null) {
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const message of this.messages) {
      this.ws.send(JSON.stringify(message));
    }

    this.messages = [];
  }

  // called by Subscription

  public setSubscription(
    subscriptionKey: number,
    subscription: Subscription<ResponseResult>
  ): void {
    this.subscriptions.set(subscriptionKey, subscription);
  }

  public deleteSubscription(subscriptionKey: number) {
    this.subscriptions.delete(subscriptionKey);
  }

  public subscribe<P extends EndpointParams<U>>(
    endpoint: P
  ): Subscription<EndpointResult<U, P>> {
    const emitter = new Emitter();

    this.emit("subscribe", endpoint, emitter);

    const self = this as Client<any, any>;

    const subscription = new Subscription<EndpointResult<U, P>>(
      self,
      this.subscriptionKey++,
      endpoint
    );

    subscription.subscribe();

    // ws.onmessage will take care of emitting these events

    subscription
      .on("response", (response): void => {
        emitter.emit("response", response);
      })
      .on("success", (): void => {
        emitter.emit("success");
      })
      .on("result", (result): void => {
        emitter.emit("result", result);
      })
      .on("error", (error): void => {
        emitter.emit("error", error);
      });

    return subscription;
  }

  /*

  subscribeAll() is called by openWebSocket()

  --

  since we are clearing messages, this question arises:

  - what happens if there is a message { ..., endpoint: null } in this.messages?
    server wouldn't know about the unsubscribe signal, right?

  openWebSocket() will be called only when the current ws is closed
  so the server will know that this connection is closed
  and will unsubscribe every subscription abruptly

  second, if we have a message { ..., endpoint: null } it means it comes from an unsubscribed subscription,
  the new ws connection doesn't need to know about it since it's unsubscribed,
  we only work with the current subscriptions now

  - ok, what if we have a message { ..., endpoint: {...} }?

  messages will be cleared, sure,
  but then messages for the current subscriptions will be re-added,
  so no subscription will be lost when trying to send the messages to the new ws connection

  --

  both cases are unlikely to happen:
  if the current ws connection is open, messages will be sent immediately and messages will be empty every time messages are sent

  */

  private subscribeAll(): void {
    this.messages = [];

    this.subscriptions.forEach((subscription): void => {
      subscription.subscribe();
    });
  }
}
