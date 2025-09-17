import { EverEmitter } from "everemitter";

import { ErrorWithCode } from "./ErrorWithCode";
import { Response, ResponseResult } from "./Response";

export type EmitterSignatures<R extends ResponseResult> = {
  response: (response: Response<R>) => any;
  success: () => any;
  result: (result: R) => any;
  error: (error: ErrorWithCode) => any;
};

export class Emitter<R extends ResponseResult> extends EverEmitter<
  EmitterSignatures<R>
> {}
