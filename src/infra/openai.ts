import OpenAI from 'openai';

export type OpenAIConfig = {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  model?: string;
};

export type OpenAIResponseText = {
  outputText: string;
  usage?: unknown;
  requestId?: string;
  model?: string;
};

export function createOpenAIClient(config: OpenAIConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY is required to use the OpenAI client.');
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    organization: config.organization,
    project: config.project,
  });
}

export async function createTextResponse(
  client: OpenAI,
  options: {
    model: string;
    input: string;
    instructions?: string;
  }
): Promise<OpenAIResponseText> {
  const response = await client.responses.create({
    model: options.model,
    input: options.input,
    instructions: options.instructions,
  });

  return {
    outputText: response.output_text ?? '',
    usage: response.usage,
    requestId: response._request_id ?? undefined,
    model: response.model,
  };
}
