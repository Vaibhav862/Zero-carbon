import { Mastra } from '@mastra/core';
import ocrCleanerAgent from './agents/ocrCleanerAgent.js';
import { Mastra } from '@mastra/core';
import ocrCleanerAgent from './agents/ocrCleanerAgent.js';
import classifierAgent from './agents/classifierAgent.js';
import vendorAgent from './agents/vendorAgent.js';
import extractorAgent from './agents/extractorAgent.js';
import validatorAgent from './agents/validatorAgent.js';
import formatterAgent from './agents/formatterAgent.js';
import extractionWorkflow from './workflows/extractionWorkflow.js';

export const mastra = new Mastra({
  agents: {
    ocrCleanerAgent,
    classifierAgent,
    vendorAgent,
    extractorAgent,
    validatorAgent,
    formatterAgent,
  },
  workflows: {
    extractionWorkflow,
  },
});

export default mastra;
