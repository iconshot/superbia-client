export class ErrorWithCode extends Error {
  constructor(public readonly code: number | null, message: string) {
    super(message);
  }
}
