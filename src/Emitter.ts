import { EverEmitter } from "everemitter";

import { SuperbiaError } from "./SuperbiaError";
import { Response } from "./Response";

export type EmitterSignatures<R> = {
  response: (response: Response<R>) => any;
  success: () => any;
  result: (result: R) => any;
  error: (error: SuperbiaError) => any;
};

export class Emitter extends EverEmitter<
  EmitterSignatures<Record<string, any>>
> {}
