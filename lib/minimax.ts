import OpenAI from "openai";

let client: OpenAI | null = null;

export function getMiniMaxClient() {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1",
    });
  }

  return client;
}

export function getMiniMaxModel() {
  return process.env.MINIMAX_MODEL || "MiniMax-M2.5";
}
