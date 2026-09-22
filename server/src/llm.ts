import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL_PRICING: Record<
  string,
  {
    inputPerMillion: number;
    outputPerMillion: number;
  }
> = {
  "gpt-5.6-luna": {
    inputPerMillion: 0.2,
    outputPerMillion: 1.2,
  },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new Error(`No pricing configured for model: ${model}`);
  }

  const inputCost =
    (inputTokens / 1_000_000) * pricing.inputPerMillion;

  const outputCost =
    (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return inputCost + outputCost;
}

export async function processText(text: string) {
  const model = process.env.LLM_MODEL || "gpt-5.6-luna";

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await client.responses.create({
    model,
    input: `Analyze the following content and extract the important information clearly.

Content:
${text}`,
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  const totalTokens =
    response.usage?.total_tokens ??
    inputTokens + outputTokens;

  return {
    model,
    text: response.output_text,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
  };
}