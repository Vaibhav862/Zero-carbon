import { createWorkflow, createStep } from '@mastra/core/workflows';
import { ocrCleanerAgent } from '../agents/ocrCleanerAgent.js';
import { classifierAgent } from '../agents/classifierAgent.js';
import { vendorAgent } from '../agents/vendorAgent.js';
import { extractorAgent } from '../agents/extractorAgent.js';
import { validatorAgent } from '../agents/validatorAgent.js';
import { formatterAgent } from '../agents/formatterAgent.js';
import Extraction from '../../models/Extraction.js';
import logger from '../../utils/logger.js';

// Safe JSON parser helper
const cleanAndParseJSON = (text) => {
  if (!text) return {};
  try {
    let cleaned = text.trim();
    // Strip markdown code block wrappers if present
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error(`JSON Parse Error on text: ${text.substring(0, 100)}... | Error: ${err.message}`);
    // Attempt regex fallback for key properties
    const res = {};
    const typeMatch = text.match(/"document_type"\s*:\s*"([^"]+)"/);
    if (typeMatch) res.document_type = typeMatch[1];
    const vendorMatch = text.match(/"vendor_name"\s*:\s*"([^"]+)"/);
    if (vendorMatch) res.vendor_name = vendorMatch[1];
    const amountMatch = text.match(/"total_amount"\s*:\s*([\d.]+)/);
    if (amountMatch) res.total_amount = parseFloat(amountMatch[1]);
    return res;
  }
};

// ─── Step 0: Clean OCR Text ───────────────────────────────────────────────────
const cleanOcrStep = createStep({
  id: 'clean-ocr-step',
  execute: async ({ getInitData }) => {
    const { raw_text } = getInitData();
    logger.info('[Workflow] Running OCR cleaning step...');
    const result = await ocrCleanerAgent.generate([
      { role: 'user', content: raw_text }
    ]);
    return {
      cleaned_text: result.text || raw_text,
      agent_trace: { ocr_cleaner: { raw_input: raw_text, cleaned_output: result.text } }
    };
  }
});

// ─── Step 1: Classify Document ────────────────────────────────────────────────
const classifyStep = createStep({
  id: 'classify-step',
  execute: async ({ getStepResult }) => {
    const cleanRes = getStepResult('clean-ocr-step');
    const cleanedText = cleanRes?.cleaned_text;
    logger.info('[Workflow] Running classification step...');
    const result = await classifierAgent.generate([
      { role: 'user', content: `Analyze this document text and classify its type:\n\n${cleanedText}` }
    ]);
    const data = cleanAndParseJSON(result.text);
    logger.info(`[Workflow] Classified as: ${data.document_type} (conf: ${data.confidence_score})`);
    return {
      document_type: data.document_type || 'unknown',
      classifier_confidence: data.confidence_score || 0.5,
      reasoning: data.reasoning || '',
      agent_trace: { classifier: data }
    };
  }
});

// ─── Step 2: Identify Vendor ──────────────────────────────────────────────────
const vendorStep = createStep({
  id: 'vendor-step',
  execute: async ({ getStepResult }) => {
    const cleanRes = getStepResult('clean-ocr-step');
    const cleanedText = cleanRes?.cleaned_text;
    logger.info('[Workflow] Running vendor identification step...');
    const result = await vendorAgent.generate([
      { role: 'user', content: `Identify the vendor/supplier from this document text:\n\n${cleanedText}` }
    ]);
    const data = cleanAndParseJSON(result.text);
    logger.info(`[Workflow] Vendor identified: ${data.vendor_name || data.vendor} (conf: ${data.confidence_score})`);
    return {
      vendor_name: data.vendor_name || data.vendor || 'Unknown Vendor',
      vendor_type: data.vendor_type || 'Other',
      industry: data.industry || 'Other',
      known_vendor: !!data.known_vendor || !!data.is_known_vendor,
      vendor_confidence: data.confidence_score || 0.5,
      agent_trace: { vendor: data }
    };
  }
});

// ─── Step 3: Extract Fields ───────────────────────────────────────────────────
const extractStep = createStep({
  id: 'extract-step',
  execute: async ({ getStepResult }) => {
    const cleanRes = getStepResult('clean-ocr-step');
    const classifyRes = getStepResult('classify-step');
    const cleanedText = cleanRes?.cleaned_text;
    const docType = classifyRes?.document_type || 'unknown';

    logger.info(`[Workflow] Running extraction step for type: ${docType}...`);
    const result = await extractorAgent.generate([
      { role: 'user', content: `Document Type: ${docType}\n\nDocument Text:\n${cleanedText}` }
    ]);
    const data = cleanAndParseJSON(result.text);
    return {
      extracted_fields: data,
      extractor_confidence: data.confidence_score || 0.5,
      agent_trace: { extractor: data }
    };
  }
});

// ─── Step 4: Database Duplicate Check ─────────────────────────────────────────
const duplicateCheckStep = createStep({
  id: 'duplicate-check-step',
  execute: async ({ getStepResult }) => {
    logger.info('[Workflow] Running database duplicate invoice check...');
    const classifyRes = getStepResult('classify-step');
    const vendorRes = getStepResult('vendor-step');
    const extractRes = getStepResult('extract-step');

    const docType = classifyRes?.document_type;
    const vendor = vendorRes?.vendor_name;
    const fields = extractRes?.extracted_fields || {};

    if (!docType || !vendor) {
      return { is_duplicate: false, duplicate_warning: null };
    }

    // Try to find matching invoice number or consumer number
    const invoiceNumber = fields.invoice_number?.value;
    const consumerNumber = fields.consumer_number?.value;

    let duplicate = null;
    let query = null;

    if (invoiceNumber) {
      query = {
        document_type: docType,
        vendor,
        $or: [
          { 'fields.invoice_number.value': invoiceNumber },
          { 'fields.invoice_number': invoiceNumber }
        ]
      };
    } else if (consumerNumber) {
      const billingPeriod = fields.billing_period?.value || fields.billing_period;
      if (billingPeriod) {
        query = {
          document_type: docType,
          vendor,
          $or: [
            { 'fields.consumer_number.value': consumerNumber, billing_period: billingPeriod },
            { 'fields.consumer_number': consumerNumber, billing_period: billingPeriod }
          ]
        };
      }
    }

    if (query) {
      try {
        duplicate = await Extraction.findOne(query);
      } catch (err) {
        logger.error(`Database duplicate check failed: ${err.message}`);
      }
    }

    if (duplicate) {
      const msg = invoiceNumber
        ? `Duplicate check: Invoice number "${invoiceNumber}" already exists in the system for vendor "${vendor}".`
        : `Duplicate check: Bill for consumer number "${consumerNumber}" already exists for vendor "${vendor}".`;
      logger.warn(`[Workflow] ${msg}`);
      return { is_duplicate: true, duplicate_warning: msg };
    }

    return { is_duplicate: false, duplicate_warning: null };
  }
});

// ─── Step 5: Validate Data ────────────────────────────────────────────────────
const validationStep = createStep({
  id: 'validation-step',
  execute: async ({ getStepResult }) => {
    logger.info('[Workflow] Running validation step...');
    const classifyRes = getStepResult('classify-step');
    const vendorRes = getStepResult('vendor-step');
    const extractRes = getStepResult('extract-step');
    const dupRes = getStepResult('duplicate-check-step');

    const payload = {
      document_type: classifyRes?.document_type,
      vendor: vendorRes?.vendor_name,
      ...extractRes?.extracted_fields,
      is_duplicate: dupRes?.is_duplicate
    };

    const result = await validatorAgent.generate([
      { role: 'user', content: `Validate this extracted data:\n\n${JSON.stringify(payload)}` }
    ]);
    const data = cleanAndParseJSON(result.text);

    // Merge system-generated duplicate warnings with LLM validation warnings
    const warnings = data.validation_warnings || [];
    if (dupRes?.duplicate_warning) {
      warnings.push(dupRes.duplicate_warning);
    }

    return {
      validation_warnings: warnings,
      agent_trace: { validator: data }
    };
  }
});

// ─── Step 6: Format Output ────────────────────────────────────────────────────
const formatStep = createStep({
  id: 'format-step',
  execute: async ({ getStepResult }) => {
    logger.info('[Workflow] Running formatting step...');
    const classifyRes = getStepResult('classify-step');
    const vendorRes = getStepResult('vendor-step');
    const extractRes = getStepResult('extract-step');
    const valRes = getStepResult('validation-step');

    const combinedPayload = {
      document_type: classifyRes?.document_type,
      vendor: vendorRes?.vendor_name,
      vendor_confidence: vendorRes?.vendor_confidence,
      ...extractRes?.extracted_fields,
      validation_warnings: valRes?.validation_warnings || [],
    };

    const result = await formatterAgent.generate([
      { role: 'user', content: `Format the final JSON from these compiled records:\n\n${JSON.stringify(combinedPayload)}` }
    ]);
    const data = cleanAndParseJSON(result.text);

    // Calculate aggregated confidence score
    let totalConfidence = 0;
    let fieldCount = 0;
    const fields = extractRes?.extracted_fields || {};
    Object.values(fields).forEach(field => {
      if (field && typeof field.confidence === 'number') {
        totalConfidence += field.confidence;
        fieldCount++;
      }
    });
    const avgConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0.5;

    // Build agent trace
    const agentTrace = {
      ocr_cleaner: getStepResult('clean-ocr-step')?.agent_trace?.ocr_cleaner,
      classifier: classifyRes?.agent_trace?.classifier,
      vendor: vendorRes?.agent_trace?.vendor,
      extractor: extractRes?.agent_trace?.extractor,
      validator: valRes?.agent_trace?.validator,
      formatter: data
    };

    return {
      final_output: {
        document_type: data.document_type || classifyRes?.document_type || 'unknown',
        vendor: data.vendor || vendorRes?.vendor_name || 'Unknown Vendor',
        vendor_confidence: data.vendor_confidence || vendorRes?.vendor_confidence || 0.5,
        bill_date: data.bill_date || fields.bill_date?.value || null,
        billing_period: data.billing_period || fields.billing_period?.value || null,
        due_date: data.due_date || fields.due_date?.value || null,
        fields: data.fields || fields || {},
        total_amount: data.total_amount || fields.total_amount?.value || null,
        currency: data.currency || 'INR',
        confidence_score: Number(avgConfidence.toFixed(2)),
        validation_warnings: data.validation_warnings || valRes?.validation_warnings || [],
        agent_trace: agentTrace
      }
    };
  }
});

// ─── Workflow Orchestration ───────────────────────────────────────────────────
export const extractionWorkflow = createWorkflow({
  id: 'extraction-workflow',
})
  .then(cleanOcrStep)
  .then(classifyStep)
  .then(vendorStep)
  .then(extractStep)
  .then(duplicateCheckStep)
  .then(validationStep)
  .then(formatStep)
  .commit();

export default extractionWorkflow;