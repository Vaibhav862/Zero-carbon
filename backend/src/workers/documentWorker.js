import 'dotenv/config';
import fs from 'fs/promises';
import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import connectDB from '../config/database.js';
import Document from '../models/Document.js';
import OcrResult from '../models/OcrResult.js';
import Extraction from '../models/Extraction.js';
import { runOCR } from '../services/ocrService.js';
import { extractionWorkflow } from '../mastra/workflows/extractionWorkflow.js';
import logger from '../utils/logger.js';

connectDB();

logger.info('Starting BullMQ Document Processing Worker...');

const OCR_QUALITY_THRESHOLD = 0.6; // below this, fall back to vision-LLM path
const VISION_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

const worker = new Worker(
  'document-processing',
  async (job) => {
    const { documentId, filePath, mimeType } = job.data;
    logger.info(`Processing job ${job.id} | Document: ${documentId}`);

    const doc = await Document.findById(documentId);
    if (!doc) {
      logger.error(`Document not found in database: ${documentId}`);
      throw new Error(`Document not found: ${documentId}`);
    }

    try {
      await Document.findByIdAndUpdate(documentId, { status: 'ocr_processing' });

      // 3. Run OCR Pipeline
      const ocrData = await runOCR(filePath, mimeType);

      await OcrResult.findOneAndUpdate(
        { document_id: doc._id },
        {
          document_id: doc._id,
          raw_text: ocrData.raw_text,
          method: ocrData.method,
          page_count: ocrData.page_count,
          char_count: ocrData.char_count,
          quality_score: ocrData.quality_score,
          created_at: new Date(),
        },
        { upsert: true, new: true }
      );
      logger.info(`OCR Result saved for Document: ${documentId}`);

      // 3b. Vision path temporarily disabled - focus on text extraction improvements first
      const useVisionPath = false;

      await Document.findByIdAndUpdate(documentId, { status: 'ai_extracting' });

      // 5. Execute Mastra Agentic AI Workflow
      logger.info(`Running Mastra AI Workflow for Document: ${documentId}`);
      const run = await extractionWorkflow.createRun();
      const workflowResult = await run.start({
        inputData: {
          raw_text: ocrData.raw_text,
        },
      });

      if (workflowResult.status === 'failed') {
        const errorMsg = workflowResult.error || 'AI Extraction Workflow failed';
        logger.error(`Mastra Workflow failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const finalOutput = workflowResult.result?.final_output;
      if (!finalOutput) {
        throw new Error('Workflow completed but returned empty output');
      }

      logger.info(`AI Extraction workflow completed successfully for Document: ${documentId}`);

      await Extraction.findOneAndUpdate(
        { document_id: doc._id },
        {
          document_id: doc._id,
          document_type: finalOutput.document_type,
          vendor: finalOutput.vendor,
          vendor_confidence: finalOutput.vendor_confidence,
          bill_date: finalOutput.bill_date,
          billing_period: finalOutput.billing_period,
          due_date: finalOutput.due_date,
          fields: finalOutput.fields || {},
          total_amount: finalOutput.total_amount,
          currency: finalOutput.currency || 'INR',
          confidence_score: finalOutput.confidence_score,
          extraction_mode: useVisionPath ? 'vision' : 'text', // NEW: track which path was used
          validation_warnings: finalOutput.validation_warnings || [],
          agent_trace: finalOutput.agent_trace || {},
          extracted_at: new Date(),
        },
        { upsert: true, new: true }
      );
      logger.info(`Extraction results saved for Document: ${documentId}`);

      logger.info(`Job ${job.id} completed successfully`);
      return { success: true, documentId };
    } catch (error) {
      logger.error(`Error processing document ${documentId}: ${error.message}`);
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        error_message: error.message || 'An unknown error occurred during processing',
      });
      throw error;
    }
  },
  { connection: redisConfig, concurrency: 2 }
);

worker.on('active', (job) => logger.info(`Job ${job.id} has started processing`));
worker.on('completed', (job, result) =>
  logger.info(`Job ${job.id} has completed. Result: ${JSON.stringify(result)}`)
);
worker.on('failed', (job, err) => logger.error(`Job ${job?.id} failed with error: ${err.message}`));