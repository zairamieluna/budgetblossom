/**
 * GoogleVisionProvider.js
 *
 * Budget Blossom
 * OCR Provider
 *
 * Currently mocked.
 * Later this file will call
 * Google Cloud Vision API.
 */

export default class GoogleVisionProvider {
  async scan(file) {
    // Simulate upload

    await new Promise((resolve) =>
      setTimeout(resolve, 1200)
    );

    return {
      provider: "google-vision",

      filename: file.name,

      documentType: "unknown",

      confidence: 0.98,

      text: "",

      raw: {},
    };
  }
}
