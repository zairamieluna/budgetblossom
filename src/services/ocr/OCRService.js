/**
 * OCRService.js
 *
 * Budget Blossom
 *
 * OCR service wrapper.
 *
 * Purpose:
 * - Connect the OCR pipeline to the selected OCR provider
 * - Provide a consistent scanDocument() method
 * - Normalize OCR provider errors
 */

export default class OCRService {
  constructor(provider) {
    this.provider = provider;
  }

  async scanDocument(file) {
    if (!file) {
      throw new Error("No document was selected.");
    }

    if (!this.provider) {
      throw new Error("OCR provider is not configured.");
    }

    if (typeof this.provider.scan !== "function") {
      throw new Error(
        "OCR provider does not support document scanning."
      );
    }

    try {
      const result = await this.provider.scan(file);

      if (!result) {
        throw new Error(
          "The OCR provider returned no result."
        );
      }

      return {
        provider:
          result.provider || "unknown",

        filename:
          result.filename || file.name,

        confidence:
          typeof result.confidence === "number"
            ? result.confidence
            : 0,

        text:
          typeof result.text === "string"
            ? result.text
            : "",

        raw:
          result.raw || {},
      };
    } catch (error) {
      console.error(
        "OCRService scan error:",
        error
      );

      throw new Error(
        error?.message ||
          "Unable to scan the selected document."
      );
    }
  }
}
