export declare class SuperbiaError extends Error {
    readonly code: number | null;
    constructor(code: number | null, message: string);
}
