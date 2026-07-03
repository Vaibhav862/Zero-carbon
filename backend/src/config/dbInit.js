import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// ─── Helper: create collection only if it doesn't exist ─────────────────────
const safeCreateCollection = async (db, name, options = {}) => {
  try {
    await db.createCollection(name, options);
    logger.info(`Collection created: ${name}`);
  } catch (err) {
    if (err.codeName === 'NamespaceExists' || err.code === 48) {
      logger.debug(`Collection already exists: ${name}`);
    } else {
      throw err;
    }
  }
};

// ─── Helper: create index only if it doesn't exist ──────────────────────────
const safeCreateIndex = async (collection, indexSpec, options = {}) => {
  try {
    await collection.createIndex(indexSpec, options);
  } catch (err) {
    if (
      err.codeName === 'IndexKeySpecsConflict' ||
      err.code === 86 ||
      err.codeName === 'IndexOptionsConflict' ||
      err.code === 85 ||
      err.message.includes('already exists')
    ) {
      logger.debug(`Index already exists on: ${JSON.stringify(indexSpec)} | Details: ${err.message}`);
    } else {
      throw err;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INIT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════
export const initializeDatabase = async () => {
  const db = mongoose.connection.db;
  logger.info('Initializing database collections and indexes...');

  // ── 1. users ────────────────────────────────────────────────────────────────
  await safeCreateCollection(db, 'users', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'password_hash', 'role'],
        properties: {
          email:          { bsonType: 'string', description: 'User email - required' },
          password_hash:  { bsonType: 'string', description: 'bcrypt hash' },
          name:           { bsonType: 'string' },
          role:           { enum: ['admin', 'user'], description: 'RBAC role' },
          is_active:      { bsonType: 'bool' },
          refresh_token:  { bsonType: 'string' },
          last_login:     { bsonType: 'date' },
          created_at:     { bsonType: 'date' },
          updated_at:     { bsonType: 'date' },
        },
      },
    },
    validationAction: 'error',
    validationLevel: 'strict',
  });

  const users = db.collection('users');
  await safeCreateIndex(users, { email: 1 }, { unique: true, name: 'idx_users_email' });
  await safeCreateIndex(users, { role: 1 }, { name: 'idx_users_role' });

  // ── 2. documents ────────────────────────────────────────────────────────────
  await safeCreateCollection(db, 'documents', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['user_id', 'filename', 'original_name', 'mime_type', 'status'],
        properties: {
          user_id:        { bsonType: 'objectId', description: 'Ref to users._id' },
          filename:       { bsonType: 'string', description: 'Saved filename on disk' },
          original_name:  { bsonType: 'string', description: 'Original uploaded filename' },
          mime_type:      { bsonType: 'string' },
          file_path:      { bsonType: 'string' },
          file_size:      { bsonType: 'int', description: 'Size in bytes' },
          status: {
            enum: ['queued', 'ocr_processing', 'ai_extracting', 'done', 'failed'],
            description: 'Pipeline stage',
          },
          job_id:         { bsonType: 'string', description: 'BullMQ job ID' },
          error_message:  { bsonType: 'string' },
          uploaded_at:    { bsonType: 'date' },
          updated_at:     { bsonType: 'date' },
        },
      },
    },
    validationAction: 'error',
    validationLevel: 'strict',
  });

  const documents = db.collection('documents');
  await safeCreateIndex(documents, { user_id: 1, uploaded_at: -1 }, { name: 'idx_docs_user_date' });
  await safeCreateIndex(documents, { status: 1 }, { name: 'idx_docs_status' });
  await safeCreateIndex(documents, { job_id: 1 }, { sparse: true, name: 'idx_docs_job' });

  // ── 3. ocr_results ──────────────────────────────────────────────────────────
  await safeCreateCollection(db, 'ocr_results', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['document_id', 'raw_text', 'method'],
        properties: {
          document_id:    { bsonType: 'objectId', description: 'Ref to documents._id' },
          raw_text:       { bsonType: 'string', description: 'Full extracted text' },
          method: {
            enum: ['pdf-parse', 'tesseract', 'paddle'],
            description: 'OCR engine used',
          },
          page_count:     { bsonType: 'int' },
          char_count:     { bsonType: 'int' },
          quality_score:  { bsonType: 'double', description: '0.0 - 1.0 confidence of OCR' },
          pages:          { bsonType: 'array', description: 'Per-page text array' },
          created_at:     { bsonType: 'date' },
        },
      },
    },
    validationAction: 'warn',
    validationLevel: 'moderate',
  });

  const ocrResults = db.collection('ocr_results');
  await safeCreateIndex(ocrResults, { document_id: 1 }, { unique: true, name: 'idx_ocr_doc' });
  await safeCreateIndex(ocrResults, { raw_text: 'text' }, { name: 'idx_ocr_fulltext' });

  // ── 4. extractions ──────────────────────────────────────────────────────────
  await safeCreateCollection(db, 'extractions', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['document_id', 'document_type'],
        properties: {
          document_id:    { bsonType: 'objectId', description: 'Ref to documents._id' },
          document_type: {
            enum: [
              'electricity_bill', 'diesel_invoice', 'coal_invoice',
              'water_bill', 'gas_bill', 'lpg_bill', 'steam_bill',
              'rec', 'transport_invoice', 'material_invoice', 'unknown',
            ],
          },
          vendor:               { bsonType: 'string' },
          vendor_confidence:    { bsonType: 'double' },
          bill_date:            { bsonType: 'string' },
          billing_period:       { bsonType: 'string' },
          due_date:             { bsonType: 'string' },
          fields:               { bsonType: 'object', description: 'Type-specific fields (kWh, litres, tonnes, etc.)' },
          total_amount:         { bsonType: 'double' },
          currency:             { bsonType: 'string' },
          confidence_score:     { bsonType: 'double', description: '0.0 - 1.0 overall AI confidence' },
          validation_warnings:  { bsonType: 'array', description: 'Array of warning strings' },
          agent_trace: {
            bsonType: 'object',
            description: 'Per-agent outputs for debugging',
            properties: {
              classifier:  { bsonType: 'object' },
              vendor:      { bsonType: 'object' },
              extractor:   { bsonType: 'object' },
              validator:   { bsonType: 'object' },
              formatter:   { bsonType: 'object' },
            },
          },
          extracted_at:   { bsonType: 'date' },
        },
      },
    },
    validationAction: 'warn',
    validationLevel: 'moderate',
  });

  const extractions = db.collection('extractions');
  await safeCreateIndex(extractions, { document_id: 1 }, { unique: true, name: 'idx_ext_doc' });
  await safeCreateIndex(extractions, { document_type: 1 }, { name: 'idx_ext_type' });
  await safeCreateIndex(extractions, { vendor: 1, bill_date: 1 }, { name: 'idx_ext_vendor_date' });
  // Duplicate invoice detection — sparse because not all doc types have invoice_number
  await safeCreateIndex(
    extractions,
    { 'fields.invoice_number': 1, vendor: 1 },
    { sparse: true, name: 'idx_ext_duplicate_check' }
  );

  // ── 5. approvals ────────────────────────────────────────────────────────────
  await safeCreateCollection(db, 'approvals', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['extraction_id', 'document_id', 'reviewed_by', 'status'],
        properties: {
          extraction_id:  { bsonType: 'objectId', description: 'Ref to extractions._id' },
          document_id:    { bsonType: 'objectId', description: 'Ref to documents._id' },
          reviewed_by:    { bsonType: 'objectId', description: 'Ref to users._id' },
          status: {
            enum: ['pending', 'approved', 'rejected'],
          },
          corrections: {
            bsonType: 'object',
            description: 'Field-level diff: { field: { original, corrected } }',
          },
          final_json:     { bsonType: 'object', description: 'The approved structured output' },
          notes:          { bsonType: 'string' },
          reviewed_at:    { bsonType: 'date' },
        },
      },
    },
    validationAction: 'warn',
    validationLevel: 'moderate',
  });

  const approvals = db.collection('approvals');
  await safeCreateIndex(approvals, { extraction_id: 1 }, { unique: true, name: 'idx_app_ext' });
  await safeCreateIndex(approvals, { document_id: 1 }, { name: 'idx_app_doc' });
  await safeCreateIndex(approvals, { reviewed_by: 1, reviewed_at: -1 }, { name: 'idx_app_user_date' });
  await safeCreateIndex(approvals, { status: 1 }, { name: 'idx_app_status' });

  logger.info('Database initialization complete. All collections and indexes ready.');
};