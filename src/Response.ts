import { SuperbiaError } from "./SuperbiaError";

export type ResponseResult = Record<string, any>;

type ServerResponseError = { code: number | null; message: string } | null;

export interface ServerResponse {
  data: Record<string, { data: any; error: ServerResponseError }>;
  error: ServerResponseError;
}

// methods are called json() and result() instead of verbs to keep consistency with global Response methods like json() or text()

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
      data: {
        user: {
          data: {
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

  the output will later be used in parse()

  */

  private process(): void {
    const response = this.response;

    if (response.error !== null) {
      this.cache.error = new SuperbiaError(
        response.error.code,
        response.error.message
      );

      return;
    }

    /*
  
    if response.data is null, it means two things:

    - it's the first subscription response
    - we can emit the "success" event for the subscription

    */

    if (response.data === null) {
      return;
    }

    const results: ResponseResult = {};

    for (const key in response.data) {
      const result = response.data[key];

      if (result.error !== null) {
        this.cache.error = new SuperbiaError(
          result.error.code,
          result.error.message
        );

        return;
      }

      results[key] = result.data;
    }

    this.cache.result = results as R;
  }

  public json(): ServerResponse {
    return this.response;
  }

  public parse(): R | null {
    const { result, error } = this.cache;

    if (error !== null) {
      throw error;
    }

    return result;
  }

  public result(): R {
    return this.parse()!;
  }
}
