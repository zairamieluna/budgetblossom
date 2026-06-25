/**
 * src/services/ocr/OCRService.js
 *
 * Budget Blossom
 * Smart Scanner Service
 *
 * This service is responsible for sending uploaded
 * documents to whichever OCR provider is configured.
 *
 * All UI pages should ONLY call this service.
 * They should never call an OCR API directly.
 */

export class OCRService {
  constructor(provider = null) {
    this.provider = provider;
  }

  /**
   * Scan a document.
   *
   * @param {File} file
   * @returns {Promise<Object>}
   */
  async scanDocument(file) {
    if (!file) {
      throw new Error("No file selected.");
    }

    if (!this.provider) {
      throw new Error(
        "No OCR provider configured."
      );
    }

    return this.provider.scan(file);
  }

  /**
   * Returns true if OCR provider exists.
   */
  isReady() {
    return !!this.provider;
  }

  /**
   * Change OCR provider.
   */
  setProvider(provider) {
    this.provider = provider;
  }
}

const ocrService = new OCRService();

export default ocrService;
