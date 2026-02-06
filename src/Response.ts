import { ErrorWithCode } from "./ErrorWithCode";

export type ResponseResult = Record<string, any>;

type ServerResponseError = { code: number | null; message: string } | null;

export interface ServerResponse {
  result: Record<string, { result: any; error: ServerResponseError }>;
  error: ServerResponseError;
}

export class Response<R extends ResponseResult> {
  // since we may call result() multiple times, we cache the result

  private cache: { result: R | null; error: Error | null } = {
    result: null,
    error: null,
  };

  constructor(private readonly response: ServerResponse) {
    this.process();
  }

  /*
  
  convert response to a more readable object

  input:
  
    {
      result: {
        user: {
          result: {
            id: "1",
            name: "Jhon Doe",
          },
          error: null
        },
      },
      error: null
    }

  output:
  
    {
      user: {
        id: "1",
        name: "Jhon Doe"
      }
    }

  the output will be later used in result()

  */

  private process(): void {
    const response = this.response;

    if (response.error !== null) {
      this.cache.error = new ErrorWithCode(
        response.error.code,
        response.error.message,
      );

      return;
    }

    /*
  
    if response.result is null, it means two things:

    - it's the first subscription response
    - we can emit the "success" event for the subscription

    */

    if (response.result === null) {
      return;
    }

    const results: ResponseResult = {};

    for (const key in response.result) {
      const result = response.result[key];

      if (result.error !== null) {
        this.cache.error = new ErrorWithCode(
          result.error.code,
          result.error.message,
        );

        return;
      }

      results[key] = result.result;
    }

    this.cache.result = results as R;
  }

  public raw(): ServerResponse {
    return this.response;
  }

  public result(): R | null {
    const { result, error } = this.cache;

    if (error !== null) {
      throw error;
    }

    return result;
  }
}
