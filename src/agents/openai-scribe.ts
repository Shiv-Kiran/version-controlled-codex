import type { OpenAIConfig } from '../infra';
import { createOpenAIClient, createTextResponse } from '../infra';
import type { Scribe, ScribeInput, ScribeOutput } from './scribe';

export type OpenAIScribeOptions = {
  client: OpenAIConfig;
  model?: string;
  instructions?: string;
};

type ScribeJson = {
  commit_message?: string;
  reasoning_md?: string;
};

const DEFAULT_INSTRUCTIONS = [
  'You are the Codex-Ledger Scribe.',
  'Given a user prompt and a git diff, return strict JSON only.',
  'JSON keys: commit_message (string, Conventional Commits) and reasoning_md (markdown).',
  'Do not wrap the JSON in markdown or code fences.',
].join('\n');

function tryParseJson(text: string): ScribeJson | null {
  try {
    return JSON.parse(text) as ScribeJson;
  } catch {
    return null;
  }
}

function normalizeCommitMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'chore: update changes';
  }
  return trimmed.slice(0, 72);
}

function fallbackCommitMessage(text: string): string {
  const firstLine = text.split('\n').find((line) => line.trim().length > 0) ?? '';
  const cleaned = firstLine.replace(/^[-#>\s]+/, '');
  return normalizeCommitMessage(cleaned);
}

export class OpenAIScribe implements Scribe {
  private readonly options: OpenAIScribeOptions;

  constructor(options: OpenAIScribeOptions) {
    this.options = options;
  }

  async describe(input: ScribeInput): Promise<ScribeOutput> {
    const client = createOpenAIClient(this.options.client);
    const model = this.options.model ?? this.options.client.model ?? 'gpt-4.1-mini';
    const prompt = [
      'User prompt:',
      input.prompt,
      '',
      'Git diff:',
      input.diff,
    ].join('\n');

    const response = await createTextResponse(client, {
      model,
      input: prompt,
      instructions: this.options.instructions ?? DEFAULT_INSTRUCTIONS,
    });

    const parsed = tryParseJson(response.outputText);
    const commitMessage = normalizeCommitMessage(
      parsed?.commit_message ?? fallbackCommitMessage(response.outputText)
    );
    const reasoning = (parsed?.reasoning_md ?? response.outputText).trim();

    return {
      commitMessage,
      reasoning,
      llm: {
        model: response.model,
        usage: response.usage,
        requestId: response.requestId,
      },
    };
  }
}
