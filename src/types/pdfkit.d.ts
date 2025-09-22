declare module 'pdfkit' {
  interface PDFOptions {
    margin?: number;
  }

  class PDFDocument {
    constructor(options?: PDFOptions);
    fontSize(size: number): this;
    text(text: string, options?: { width?: number; align?: string }): this;
    end(): void;

    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export = PDFDocument;
}