export class SuperbiaError extends Error {
  constructor(public readonly code: number | null, message: string) {
    super(message);
  }
}
