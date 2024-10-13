"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperbiaError = void 0;
class SuperbiaError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.SuperbiaError = SuperbiaError;
