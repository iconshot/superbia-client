"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
const everemitter_1 = require("everemitter");
class Subscription extends everemitter_1.EverEmitter {
    constructor(client, subscriptionKey, endpoint) {
        super();
        this.client = client;
        this.subscriptionKey = subscriptionKey;
        this.endpoint = endpoint;
    }
    subscribe() {
        this.client.setSubscription(this.subscriptionKey, this);
        this.client.send(this.subscriptionKey, this.endpoint);
    }
    unsubscribe() {
        this.client.deleteSubscription(this.subscriptionKey);
        this.client.send(this.subscriptionKey, null);
    }
}
exports.Subscription = Subscription;
