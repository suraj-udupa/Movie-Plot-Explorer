import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("OPENROUTER_API_KEY is not set. AI features will not work.");
}

export const openRouterClient = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key",
  defaultHeaders: {
    "HTTP-Referer": "https://movie-plot-explorer.vercel.app",
    "X-Title": "Movie Plot Validation Platform",
  },
});

export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "deepseek/deepseek-r1";

export async function callOpenRouter(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 4096 } = options;
  const response = await openRouterClient.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false
  });
  return response.choices[0]?.message?.content || "";
}

export async function* streamOpenRouter(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): AsyncGenerator<string> {
  const { model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 4096 } = options;
  const stream = await openRouterClient.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
