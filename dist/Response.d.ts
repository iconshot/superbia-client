type EndpointResponseError = {
    code: number | null;
    message: string;
} | null;
export interface EndpointResponse {
    data: Record<string, {
        data: any;
        error: EndpointResponseError;
    }>;
    error: EndpointResponseError;
}
export declare class Response<R> {
    private readonly response;
    constructor(response: EndpointResponse);
    json(): EndpointResponse;
    parse(): R | null;
    result(): R;
}
export {};
