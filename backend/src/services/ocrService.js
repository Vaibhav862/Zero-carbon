import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import logger from '../utils/logger.js';

const MIN_CHAR_THRESHOLD = 100;
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ─── Image Preprocessing ───────────────────────────────────────────────────
const preprocessImage = async (inputPath) => {
  try {
    logger.info('Preprocessing image for better OCR accuracy...');
    const outputPath = path.join(TEMP_DIR, `preprocessed_${Date.now()}.png`);
    
    await sharp(inputPath)
      .rotate() // Auto-rotate based on EXIF
      .normalize() // Improve contrast
      .sharpen() // Sharpen text
      .threshold(128) // Binarize
      .toFile(outputPath);
    
    return outputPath;
  } catch (err) {
    logger.warn(`Image preprocessing failed: ${err.message}, using original image`);
    return inputPath;
  }
};

// ─── Cleanup Temp File ──────────────────────────────────────────────────────
const cleanupTempFile = (filePath) => {
  if (filePath.includes('preprocessed_')) {
    try {
      fs.unlinkSync(filePath);
      logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (err) {
      logger.warn(`Failed to cleanup temp file: ${err.message}`);
    }
  }
};

// ── Step 1: Try direct PDF text extraction ──────────────────────────────────
const extractFromPDF = async (filePath) => {
  try {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pageCount: data.numpages,
      method: 'pdf-parse',
    };
  } catch (err) {
    logger.warn(`pdf-parse failed: ${err.message}`);
    return null;
  }
};

// ─── Step 2: Tesseract OCR on image / poor-quality PDF ────────────────────────
const extractWithTesseract = async (filePath) => {
  let preprocessedPath = filePath;
  try {
    // Preprocess image if it's not a PDF (or if PDF fallback)
    if (!filePath.endsWith('.pdf')) {
      preprocessedPath = await preprocessImage(filePath);
    }
    
    logger.info(`Running Tesseract OCR on: ${path.basename(preprocessedPath)}`);
    const { data } = await Tesseract.recognize(preprocessedPath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    // Cleanup temp file if we created one
    cleanupTempFile(preprocessedPath);
    
    return {
      text: data.text,
      pageCount: 1,
      method: 'tesseract',
      confidence: data.confidence / 100,
    };
  } catch (err) {
    logger.error(`Tesseract failed: ${err.message}`);
    cleanupTempFile(preprocessedPath);
    throw err;
  }
};

// ── Main OCR pipeline ─────────────────────────────────────────────────────────
export const runOCR = async (filePath, mimeType) => {
  const isPDF = mimeType === 'application/pdf';
  let result = null;

  if (isPDF) {
    result = await extractFromPDF(filePath);

    // Check quality — if extracted text is too short, fall back to Tesseract
    if (!result || result.text.trim().length < MIN_CHAR_THRESHOLD) {
      logger.info(`PDF text quality poor (${result?.text?.trim().length || 0} chars). Falling back to Tesseract.`);
      result = await extractWithTesseract(filePath);
    }
  } else {
    // Image — go straight to Tesseract with preprocessing
    result = await extractWithTesseract(filePath);
  }

  const charCount = result.text.trim().length;
  const qualityScore = result.confidence || Math.min(1, charCount / 2000);

  logger.info(`OCR complete | method: ${result.method} | chars: ${charCount} | quality: ${qualityScore.toFixed(2)}`);

  return {
    raw_text: result.text,
    method: result.method,
    page_count: result.pageCount || 1,
    char_count: charCount,
    quality_score: qualityScore,
    created_at: new Date(),
  };
};