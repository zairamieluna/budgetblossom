/**
 * TesseractProvider.js
 *
 * Budget Blossom
 * Local OCR Provider
 *
 * Supports:
 * - JPG
 * - JPEG
 * - PNG
 * - WEBP
 * - PDF
 */

import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

class TesseractProvider {
  async scanDocument(file) {
    if (!file) {
      throw new Error("No document selected.");
    }

    const startTime = Date.now();

    let text = "";

    if (file.type === "application/pdf") {
      text = await this.scanPDF(file);
    } else if (file.type.startsWith("image/")) {
      text = await this.scanImage(file);
    } else {
      throw new Error(
        "Unsupported document type. Please upload a JPG, PNG, WEBP, or PDF."
      );
    }

    if (!text.trim()) {
      throw new Error(
        "No readable text was detected in this document."
      );
    }

    return {
      provider: "Tesseract.js",
      filename: file.name,
      confidence: 0,
      text,
      raw: {
        processingTime:
          Date.now() - startTime,
      },
    };
  }

  async scanImage(file) {
    const worker = await createWorker("eng");

    try {
      const result = await worker.recognize(file);

      return result.data.text || "";
    } finally {
      await worker.terminate();
    }
  }

  async scanPDF(file) {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    const worker = await createWorker("eng");

    try {
      let completeText = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        console.log(
          `OCR: Processing PDF page ${pageNumber}/${pdf.numPages}`
        );

        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
          scale: 2,
        });

        const canvas = document.createElement("canvas");

        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const result = await worker.recognize(canvas);

        completeText +=
          `\n\n--- PAGE ${pageNumber} ---\n\n` +
          (result.data.text || "");
      }

      return completeText;
    } finally {
      await worker.terminate();
    }
  }
}

export default TesseractProvider;
