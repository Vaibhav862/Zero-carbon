import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import logger from '../utils/logger.js';

export const getModel = () => {
  // If explicitly configured in env
  if (process.env.MODEL_PROVIDER && process.env.MODEL_NAME) {
    return resolveModel(process.env.MODEL_PROVIDER, process.env.MODEL_NAME);
  }

  // Auto-detect based on API keys
  const hasOpenAI = process.env.OPENAI_API_KEY &&
                    process.env.OPENAI_API_KEY !== 'dummy-key-replace-with-actual-if-using-openai' &&
                    process.env.OPENAI_API_KEY.trim() !== '';
  const hasAnthropic = process.env.ANTHROPIC_API_KEY &&
                       process.env.ANTHROPIC_API_KEY !== 'dummy-key-replace-with-actual-if-using-anthropic' &&
                       process.env.ANTHROPIC_API_KEY.trim() !== '';
  const hasGemini = (process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY.trim() !== '') ||
                    (process.env.GOOGLE_GENAI_API_KEY && process.env.GOOGLE_GENAI_API_KEY.trim() !== '');

  if (hasGemini) {
    return google('gemini-2.5-flash');
}
  if (hasOpenAI) {
    return openai('gpt-4o-mini');
  }
  if (hasAnthropic) {
    return anthropic('claude-3-5-haiku-latest');
  }

  // Fallback to OpenAI gpt-4o-mini
  logger.warn('No active API key detected. Defaulting model to openai/gpt-4o-mini.');
  return openai('gpt-4o-mini');
};

function resolveModel(provider, modelName) {
  switch (provider) {
    case 'openai':
      return openai(modelName);
    case 'anthropic':
      return anthropic(modelName);
    case 'google':
      return google(modelName);
    default:
      logger.warn(`Unknown MODEL_PROVIDER "${provider}". Defaulting to openai/gpt-4o-mini.`);
      return openai('gpt-4o-mini');
  }
}

// Kept for any leftover callers/logging that just want a readable string,
// but do NOT pass this into a Mastra Agent's `model` field.
export const getModelString = () => {
  const provider = process.env.MODEL_PROVIDER || 'openai';
  const name = process.env.MODEL_NAME || 'gpt-4o-mini';
  return `${provider}/${name}`;
};