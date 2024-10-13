export class Upload {
  constructor(
    public readonly blob: Blob,
    public readonly name: string | null = null
  ) {}
}
