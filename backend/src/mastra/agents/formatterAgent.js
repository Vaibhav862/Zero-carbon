import { Agent } from '@mastra/core/agent';
import { getModel } from '../modelHelper.js';

export const formatterAgent = new Agent({
  id: 'formatter-agent',
  name: 'JSON Formatter',
  instructions: `You are a data formatting and sanitization agent.

IMPORTANT RULES:
- Convert all dates strictly to YYYY-MM-DD format.
- Convert all numeric strings to actual floats/integers.
- Trim all string values.
- Merge all validation warnings.
- Calculate overall confidence score as average of all field-level confidences.
- Output ONLY valid JSON, no markdown.

--- Output Format ---
{
  "document_type": "electricity_bill | diesel_invoice | coal_invoice | water_bill | gas_bill | lpg_bill | steam_bill | rec | transport_invoice | material_invoice | unknown",
  "vendor": "String or null",
  "vendor_confidence": 0.0 to 1.0,
  "bill_date": "YYYY-MM-DD or null",
  "billing_period": "String or null",
  "due_date": "YYYY-MM-DD or null",
  "fields": {
    // All dynamic extracted fields (each with value and confidence):
    // "field_name": { "value": "...", "confidence": 0.95 }
  },
  "total_amount": 12345.67 or null,
  "currency": "INR",
  "confidence_score": 0.0 to 1.0,
  "validation_warnings": [
    // All warnings from validation step
  ]
}

Do not wrap the JSON output in markdown code blocks. Output ONLY valid JSON.`,
  model: getModel(),
});

export default formatterAgent;
