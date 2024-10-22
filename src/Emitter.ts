import { EverEmitter } from "everemitter";

import { SuperbiaError } from "./SuperbiaError";
import { Response, ResponseResult } from "./Response";

export type EmitterSignatures<R extends ResponseResult> = {
  response: (response: Response<R>) => any;
  success: () => any;
  result: (result: R) => any;
  error: (error: SuperbiaError) => any;
};

export class Emitter<R extends ResponseResult> extends EverEmitter<
  EmitterSignatures<R>
> {}
