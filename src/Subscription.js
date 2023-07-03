const EventEmitter = require("eventemitter3");

class Subscription extends EventEmitter {
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

    this.client.send(this.subscriptionKey, null); // the server will handle a null endpoint as a signal to unsubscribe
  }
}

module.exports = Subscription;
