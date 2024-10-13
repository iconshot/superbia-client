"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
const SuperbiaError_1 = require("./SuperbiaError");
class Response {
    constructor(response) {
        this.response = response;
    }
    json() {
        return this.response;
    }
    parse() {
        if (this.response.error !== null) {
            throw new SuperbiaError_1.SuperbiaError(this.response.error.code, this.response.error.message);
        }
        if (this.response.data === null) {
            return null;
        }
        const results = {};
        for (const key in this.response.data) {
            const result = this.response.data[key];
            if (result.error !== null) {
                throw new SuperbiaError_1.SuperbiaError(result.error.code, result.error.message);
            }
            results[key] = result.data;
        }
        return results;
    }
    result() {
        return this.parse();
    }
}
exports.Response = Response;
