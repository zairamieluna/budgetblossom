/**
 * OCRPipeline.js
 *
 * Budget Blossom
 * Free Browser OCR using Tesseract.js
 */

import { createWorker } from "tesseract.js";

import { classifyDocument } from "./DocumentClassifier";
import { extractFields } from "./FieldExtractor";
import { validateExtractedData } from "./ValidationEngine";

export async function processDocument(file) {
  if (!file) {
    throw new Error("No document selected.");
  }

  let worker;

  try {
    console.log("Starting Tesseract OCR:", file.name);

    // Create Tesseract OCR worker
    worker = await createWorker("eng");

    // Scan the document
    const result = await worker.recognize(file);

    const text = result?.data?.text || "";

    console.log("OCR TEXT:", text);

    if (!text.trim()) {
      throw new Error(
        "No text could be detected in this document."
      );
    }

    // Step 1: Classify document
    const documentType = classifyDocument(text);

    // Step 2: Extract fields
    const fields = extractFields(
      documentType,
      text
    );

    // Step 3: Validate extracted data
    const validation = validateExtractedData(
      documentType,
      fields
    );

    // Step 4: Return complete document
    return {
      provider: "tesseract.js",

      filename: file.name,

      confidence:
        result?.data?.confidence || 0,

      documentType,

      fields,

      validation,

      raw: {
        text,
      },
    };

  } catch (error) {
    console.error(
      "TESSERACT OCR ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to scan this document."
    );

  } finally {
    // Always stop the OCR worker
    if (worker) {
      await worker.terminate();
    }
  }
}
