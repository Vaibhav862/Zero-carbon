import { Agent } from '@mastra/core/agent';
import { getModel } from '../modelHelper.js';
import { KNOWN_VENDORS } from '../../utils/constants.js';

const knownVendorsFlat = Object.values(KNOWN_VENDORS).flat();

export const vendorAgent = new Agent({
  id: 'vendor-agent',
  name: 'Vendor Identifier',
  instructions: `You are an expert at identifying the vendor or utility provider from utility bill documents.

IMPORTANT RULES:
- The input text may contain OCR spelling mistakes.
- Never guess the vendor if uncertain.
- Output ONLY valid JSON, no markdown.

Analyze the provided CLEANED text.

Known vendors to match against (if possible):
${knownVendorsFlat.join(', ')}

Vendor type options:
- Utility Provider
- Fuel Supplier
- Material Supplier
- Transport Provider
- Water Supplier
- Coal Supplier
- Diesel Supplier
- Electricity Provider
- Gas Provider
- Other

Output Format:
{
  "vendor_name": "Tata Power",
  "vendor_type": "Utility Provider",
  "industry": "Energy",
  "known_vendor": true,
  "confidence_score": 0.95
}

If you cannot identify the vendor, return null for vendor_name and 0 for confidence_score.
Do not wrap the JSON output in markdown code blocks. Output ONLY valid JSON.`,
  model: getModel(),
});

export default vendorAgent;
