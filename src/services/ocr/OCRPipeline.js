/**
 * OCRPipeline.js
 *
 * Budget Blossom
 * Complete OCR Pipeline
 */

import GoogleVisionProvider from "./providers/GoogleVisionProvider";
import OCRService from "./OCRService";

import { classifyDocument } from "./DocumentClassifier";
import { extractFields } from "./FieldExtractor";
import { validateExtractedData } from "./ValidationEngine";

const provider = new GoogleVisionProvider();

const service = new OCRService(provider);

export async function processDocument(file) {
  // Step 1: Scan document
  const result = await service.scanDocument(file);

  // Step 2: Classify document
  const documentType = classifyDocument(result.text);

  // Step 3: Extract fields
  const fields = extractFields(
    documentType,
    result.text
  );

  // Step 4: Validate extracted data
  const validation = validateExtractedData(
    documentType,
    fields
  );

  // Step 5: Return complete document
  return {
    provider: result.provider,

    filename: result.filename,

    confidence: result.confidence,

    documentType,

    fields,

    validation,

    raw: result.raw,
  };
}
