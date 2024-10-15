import { SuperbiaError } from "./SuperbiaError";
import { Result } from "./Emitter";

type EndpointResponseError = { code: number | null; message: string } | null;

export interface EndpointResponse {
  data: Record<string, { data: any; error: EndpointResponseError }>;
  error: EndpointResponseError;
}

// methods are called json() and result() instead of verbs to keep consistency with global Response methods like json() or text()

export class Response<R extends Result> {
  constructor(private readonly response: EndpointResponse) {}

  public json(): EndpointResponse {
    return this.response;
  }

  /*
  
  convert this.response to a more readable object

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

  throws an Error if there's any error in this.response

  */

  public parse(): R | null {
    if (this.response.error !== null) {
      throw new SuperbiaError(
        this.response.error.code,
        this.response.error.message
      );
    }

    /*
    
    if response.data is null, it means two things:

    - it's a subscription response
    - we can emit the "success" event for the subscription

    */

    if (this.response.data === null) {
      return null;
    }

    const results: Record<string, any> = {};

    for (const key in this.response.data) {
      const result = this.response.data[key];

      if (result.error !== null) {
        throw new SuperbiaError(result.error.code, result.error.message);
      }

      results[key] = result.data;
    }

    return results as R;
  }

  public result(): R {
    return this.parse()!;
  }
}
