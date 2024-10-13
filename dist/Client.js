"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const everemitter_1 = require("everemitter");
const Upload_1 = require("./Upload");
const Response_1 = require("./Response");
const Subscription_1 = require("./Subscription");
const Emitter_1 = require("./Emitter");
class Client extends everemitter_1.EverEmitter {
    constructor({ url, wsUrl, fetch, WebSocket, FormData, }) {
        super();
        this.headers = null;
        this.ws = null;
        this.subscriptions = new Map();
        this.subscriptionKey = 0;
        this.messages = [];
        this.url = url;
        this.wsUrl = wsUrl;
        this.fetch = fetch;
        this.WebSocket = WebSocket;
        this.FormData = FormData;
    }
    update(headers) {
        this.headers = headers;
    }
    init() {
        if (this.ws !== null) {
            this.ws.onclose = () => {
                this.openWebSocket();
            };
            this.ws.close();
        }
        else {
            this.openWebSocket();
        }
    }
    deinit() {
        if (this.ws !== null) {
            this.ws.onclose = null;
            this.ws.close();
        }
        this.ws = null;
        this.emit("deinit");
    }
    async request(endpoints) {
        const { fetch, FormData } = this;
        const emitter = new Emitter_1.Emitter();
        this.emit("request", endpoints, emitter);
        const uploads = new Map();
        const parsed = this.parseRequestEndpoints(endpoints, uploads);
        const body = new FormData();
        body.append("endpoints", JSON.stringify(parsed));
        uploads.forEach((upload, uploadKey) => {
            var _a;
            body.append(`${uploadKey}`, upload.blob, (_a = upload.name) !== null && _a !== void 0 ? _a : undefined);
        });
        const options = { method: "POST", body };
        if (this.headers !== null) {
            options.headers = this.headers;
        }
        try {
            const fetchResponse = await fetch(this.url, options);
            const json = await fetchResponse.json();
            const response = new Response_1.Response(json);
            emitter.emit("response", response);
            try {
                const result = response.result();
                emitter.emit("success");
                emitter.emit("result", result);
            }
            catch (error) {
                emitter.emit("error", error);
            }
            return response;
        }
        catch (error) {
            emitter.emit("error", error);
            throw error;
        }
    }
    parseRequestEndpoints(value, uploads) {
        if (value === null) {
            return null;
        }
        if (value instanceof Upload_1.Upload) {
            const uploadKey = uploads.size;
            uploads.set(uploadKey, value);
            return { uploadKey };
        }
        if (Array.isArray(value)) {
            return value.map((tmpValue) => this.parseRequestEndpoints(tmpValue, uploads));
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
            url += "?";
            url += Object.entries(this.headers)
                .map((entry) => entry.map(encodeURIComponent).join("="))
                .join("&");
        }
        this.subscribeAll();
        const ws = new WebSocket(url);
        this.ws = ws;
        ws.onopen = () => {
            this.emit("init");
            this.sendAll();
        };
        ws.onmessage = (message) => {
            const { subscriptionKey, response: json, } = JSON.parse(message.data);
            const subscription = this.subscriptions.get(subscriptionKey);
            if (subscription === undefined) {
                return;
            }
            const response = new Response_1.Response(json);
            subscription.emit("response", response);
            try {
                const result = response.parse();
                if (result === null) {
                    subscription.emit("success");
                }
                else {
                    subscription.emit("result", result);
                }
            }
            catch (error) {
                subscription.emit("error", error);
            }
        };
        ws.onclose = () => {
            setTimeout(() => {
                this.openWebSocket();
            }, 250);
        };
    }
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
    setSubscription(subscriptionKey, subscription) {
        this.subscriptions.set(subscriptionKey, subscription);
    }
    deleteSubscription(subscriptionKey) {
        this.subscriptions.delete(subscriptionKey);
    }
    subscribe(endpoint) {
        const emitter = new Emitter_1.Emitter();
        this.emit("subscribe", endpoint, emitter);
        const self = this;
        const subscription = new Subscription_1.Subscription(self, this.subscriptionKey++, endpoint);
        subscription.subscribe();
        subscription.on("response", (response) => {
            emitter.emit("response", response);
        });
        subscription.on("success", () => {
            emitter.emit("success");
        });
        subscription.on("result", (result) => {
            emitter.emit("result", result);
        });
        subscription.on("error", (error) => {
            emitter.emit("error", error);
        });
        return subscription;
    }
    subscribeAll() {
        this.messages = [];
        this.subscriptions.forEach((subscription) => {
            subscription.subscribe();
        });
    }
}
exports.Client = Client;
