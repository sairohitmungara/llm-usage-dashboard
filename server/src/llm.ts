import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const MODEL_PRICING: Record<
  string,
  {
    inputPerMillion: number;
    outputPerMillion: number;
  }
> = {
  "openai/gpt-oss-20b": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
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
  const model =
    process.env.LLM_MODEL || "openai/gpt-oss-20b";

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await client.chat.completions.create({
    model,

    messages: [
      {
        role: "system",
        content:
          "Analyze the provided content and extract the important information clearly and concisely.",
      },
      {
        role: "user",
        content: text,
      },
    ],

    include_reasoning: false,
  });

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const totalTokens =
    response.usage?.total_tokens ??
    inputTokens + outputTokens;

  return {
    model,

    text:
      response.choices[0]?.message?.content ??
      "No response generated.",

    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
  };
}