const EventEmitter = require("eventemitter3");

const Upload = require("./Upload");
const Response = require("./Response");
const Subscription = require("./Subscription");

class Client extends EventEmitter {
  constructor({ url, wsUrl, fetch, WebSocket, FormData }) {
    super();

    this.url = url;
    this.wsUrl = wsUrl;

    // same apis for node and browser

    this.fetch = fetch;
    this.WebSocket = WebSocket;
    this.FormData = FormData;

    this.headers = null;

    this.ws = null; // websocket

    this.subscriptions = new Map();

    this.subscriptionKey = 0;

    /*

    a messages stack is needed so we can call subscribe() before the ws connection has been opened

    more on the send() comments

    */

    this.messages = [];
  }

  init(headers = null) {
    this.headers = headers;

    if (this.ws !== null) {
      this.ws.onclose = () => this.openWebSocket();

      this.ws.close();
    } else {
      this.openWebSocket();
    }
  }

  async request(endpoints) {
    const { fetch, FormData } = this;

    const emitter = new EventEmitter();

    this.emit("request", endpoints, emitter);

    const uploads = new Map();

    // parse in search of uploads

    const parsed = this.parseRequestEndpoints(endpoints, uploads);

    const body = new FormData(); // fetch body

    body.append("endpoints", JSON.stringify(parsed));

    // append uploads to body, if any

    uploads.forEach((upload, uploadKey) => {
      const file = upload.getFile();
      const name = upload.getName();

      if (name !== null) {
        body.append(uploadKey, file, name);
      } else {
        body.append(uploadKey, file);
      }
    });

    const options = { method: "POST", body }; // fetch options

    if (this.headers !== null) {
      options.headers = this.headers;
    }

    try {
      const fetchResponse = await fetch(this.url, options);

      const json = await fetchResponse.json();

      const response = new Response(json);

      emitter.emit("response", response);

      try {
        const data = response.data();

        emitter.emit("success"); // consistent with subscription

        emitter.emit("data", data);
      } catch (error) {
        // we don't throw from here because the caller may need the raw json (e.g. superbia playground)

        emitter.emit("error", error);
      }

      return response;
    } catch (error) {
      // we do throw an error here because it means there's something wrong with the fetch call itself

      emitter.emit("error", error);

      throw error;
    }
  }

  parseRequestEndpoints(value, uploads) {
    if (value === null) {
      return null;
    }

    if (value instanceof Upload) {
      const uploadKey = uploads.size + 1;

      uploads.set(uploadKey, value);

      return { uploadKey };
    }

    if (Array.isArray(value)) {
      return value.map((tmpValue) =>
        this.parseRequestEndpoints(tmpValue, uploads)
      );
    }

    if (typeof value === "object") {
      const tmpValue = {};

      for (const key in value) {
        tmpValue[key] = this.parseRequestEndpoints(value[key], uploads);
      }

      return tmpValue;
    }

    return value;
  }

  openWebSocket() {
    const { WebSocket } = this;

    let url = this.wsUrl;

    if (this.headers !== null) {
      /*
      
      unlike fetch, WebSocket doesn't accept a "headers" option,
      so we pass the headers through the url

      */

      url += "?";
      url += Object.entries(this.headers)
        .map((entry) => entry.map(encodeURIComponent).join("="))
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

    ws.onopen = () => {
      /*

      since messages are only sent when the ws connection is open,
      we may have messages in the stack that need to be sent

      */

      this.sendAll();
    };

    ws.onmessage = (message) => {
      const { subscriptionKey, response: json } = JSON.parse(message.data);

      const subscription = this.subscriptions.get(subscriptionKey);

      if (subscription === undefined) {
        return;
      }

      const response = new Response(json);

      subscription.emit("response", response);

      try {
        const data = response.data();

        if (data === null) {
          subscription.emit("success");
        } else {
          subscription.emit("data", data);
        }
      } catch (error) {
        subscription.emit("error", error);
      }
    };

    ws.onclose = () => {
      /*
        
        this can happen for multiple reasons: connection lost, server off, etc
  
        we try to reconnect
        
        */

      setTimeout(() => this.openWebSocket(), 250);
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

  send(subscriptionKey, endpoint) {
    this.messages.push({ subscriptionKey, endpoint });

    this.sendAll();
  }

  sendAll() {
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

  setSubscription(subscriptionKey, subscription) {
    this.subscriptions.set(subscriptionKey, subscription);
  }

  deleteSubscription(subscriptionKey) {
    this.subscriptions.delete(subscriptionKey);
  }

  subscribe(endpoint) {
    const emitter = new EventEmitter();

    this.emit("subscribe", endpoint, emitter);

    const subscriptionKey = this.subscriptionKey;

    const subscription = new Subscription(this, subscriptionKey, endpoint);

    subscription.subscribe();

    // ws.onmessage will take care of emitting these events

    subscription.on("response", (response) => {
      emitter.emit("response", response);
    });

    subscription.on("success", () => {
      emitter.emit("success");
    });

    subscription.on("data", (data) => {
      emitter.emit("data", data);
    });

    subscription.on("error", (error) => {
      emitter.emit("error", error);
    });

    this.subscriptionKey++;

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

  subscribeAll() {
    this.messages = [];

    this.subscriptions.forEach((subscription) => {
      subscription.subscribe();
    });
  }

  destroy() {
    this.ws.onclose = null;

    this.ws.close();

    this.ws = null;
  }
}

module.exports = Client;
