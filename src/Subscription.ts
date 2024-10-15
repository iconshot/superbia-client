import { EverEmitter } from "everemitter";

import { Client, EndpointInput } from "./Client";
import { ResponseResult } from "./Response";
import { EmitterSignatures } from "./Emitter";

export class Subscription<R extends ResponseResult> extends EverEmitter<
  EmitterSignatures<R>
> {
  constructor(
    private readonly client: Client,
    private readonly subscriptionKey: number,
    private readonly endpoint: EndpointInput
  ) {
    super();
  }

  public subscribe(): void {
    this.client.setSubscription(this.subscriptionKey, this);

    this.client.send(this.subscriptionKey, this.endpoint);
  }

  public unsubscribe(): void {
    this.client.deleteSubscription(this.subscriptionKey);

    this.client.send(this.subscriptionKey, null); // server will handle a null endpoint as a signal to unsubscribe
  }
}
