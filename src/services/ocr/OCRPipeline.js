/**
 * OCRPipeline.js
 *
 * Budget Blossom
 * Complete OCR Pipeline
 */

import GoogleVisionProvider from "./providers/GoogleVisionProvider";
import { OCRService } from "./OCRService";

import { classifyDocument } from "./DocumentClassifier";
import { extractFields } from "./FieldExtractor";
import { validateExtractedData } from "./ValidationEngine";

const provider = new GoogleVisionProvider();

const service = new OCRService(provider);

export async function processDocument(file) {
  // Step 1
  const result = await service.scanDocument(file);

  // Step 2
  const documentType = classifyDocument(result.text);

  // Step 3
  const fields = extractFields(
    documentType,
    result.text
  );

  // Step 4
  const validation = validateExtractedData(
    documentType,
    fields
  );

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
