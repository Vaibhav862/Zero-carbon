# AI Workflow

## Overview

Zero Carbon One uses **Mastra AI** to orchestrate a multi-agent pipeline. The workflow is defined in `backend/src/mastra/workflows/extractionWorkflow.js`.

---

## Workflow Steps

### 1. OCR Cleaner Agent
**File**: `backend/src/mastra/agents/ocrCleanerAgent.js`

**Purpose**: Fixes noisy, broken OCR text.

**Input**: Raw OCR text

**Output**: Cleaned human-readable text (no JSON).

**Key Rules**:
- Fix only obvious character substitutions (e.g., `B3o2` → `8302`, `Aluniinivm` → `Aluminium`)
- Fix missing spaces and word breaks
- Preserve all numbers EXACTLY (dates, invoice numbers, amounts, GSTIN, HSN)
- Never invent or hallucinate information
- If you can't read something, leave it as is
- Preserve line breaks when helpful

---

### 2. Document Classifier Agent
**File**: `backend/src/mastra/agents/classifierAgent.js`

**Purpose**: Categorizes the document type.

**Input**: Cleaned OCR text

**Output**: JSON
```json
{
  "document_type": "electricity_bill",
  "confidence_score": 0.95,
  "reasoning": "Text mentions Tata Power and kWh units."
}
```

**Supported Document Types**:
1. `electricity_bill`
2. `diesel_invoice`
3. `coal_invoice`
4. `water_bill`
5. `gas_bill`
6. `lpg_bill`
7. `steam_bill`
8. `rec` (Renewable Energy Certificate)
9. `transport_invoice`
10. `material_invoice`
11. `unknown`

---

### 3. Vendor Identifier Agent
**File**: `backend/src/mastra/agents/vendorAgent.js`

**Purpose**: Identifies the vendor/provider.

**Input**: Cleaned OCR text

**Output**: JSON
```json
{
  "vendor_name": "Tata Power",
  "vendor_type": "Utility Provider",
  "industry": "Energy",
  "known_vendor": true,
  "confidence_score": 0.95
}
```

**Known Vendors (configurable in `constants.js`)**:
- Electricity: Tata Power, Adani Electricity, BSES Rajdhani, BSES Yamuna, MSEDCL, etc.
- Diesel: IOCL, BPCL, HPCL, etc.
- Coal: Coal India, etc.
- Water: Delhi Jal Board, etc.
- Gas: IGL, MGL, etc.

---

### 4. Extractor Agent
**File**: `backend/src/mastra/agents/extractorAgent.js`

**Purpose**: Field-level extraction with confidence scores.

**Input**: Cleaned OCR text + document type

**Output**: JSON with field-level `value` and `confidence`

**Key Rules**:
- OCR may contain spelling mistakes, broken words, missing spaces, character substitutions
- Use context to correct obvious errors
- Never invent or hallucinate values! If not confident, set value = null
- Preserve numbers, GSTIN, HSN, invoice numbers EXACTLY
- Return only valid JSON, no markdown

**Extraction Schemas**:
See each agent's instructions for full field lists per document type.

---

### 5. Database Duplicate Check Step
**File**: Workflow step in `extractionWorkflow.js`

**Purpose**: Checks MongoDB for duplicates to avoid reprocessing.

**How it works**:
- Checks for matching `invoice_number` + `vendor`
- Or checks `consumer_number` + `vendor` + `billing_period`
- Returns a warning if duplicate is found

---

### 6. Validator Agent
**File**: `backend/src/mastra/agents/validatorAgent.js`

**Purpose**: Business rule validation.

**Input**: Extracted data from previous steps

**Output**: JSON with `validation_warnings` array

**Validation Checks**:
1. Missing mandatory fields (per document type)
2. Negative quantities, rates, amounts
3. Due date before bill/invoice date
4. GSTIN format validation (15 chars, correct structure)
5. HSN code validation (4/6/8 digits)
6. Math checks: `Quantity × Rate = Taxable Amount`
7. Math checks: `Taxable Amount + Taxes = Total Amount`
8. Date validity checks

---

### 7. Formatter Agent
**File**: `backend/src/mastra/agents/formatterAgent.js`

**Purpose**: Final JSON formatting, compute overall confidence score.

**Input**: All previous workflow step results

**Output**: Final JSON matching the Extraction MongoDB schema.

**Tasks**:
- Convert all dates to `YYYY-MM-DD` format
- Convert numeric strings to actual numbers
- Trim all string values
- Merge all validation warnings
- Calculate overall confidence as average of all field confidences
- Compile full `agent_trace` for debugging/audit

---

## Model Selection (LLM Providers)

**File**: `backend/src/mastra/modelHelper.js`

Priority order:
1. **Google Gemini** → `gemini-2.5-flash` (if API key present)
2. **OpenAI** → `gpt-4o-mini` (if API key present)
3. **Anthropic** → `claude-3-5-haiku-latest` (if API key present)

Falls back to OpenAI if no keys are configured (with warning in logs).