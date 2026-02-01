import type { Builder, BuilderInput, BuilderOutput } from './builder';
import type { OpenAIConfig } from '../infra';
import { applyPatch, createOpenAIClient, createTextResponse } from '../infra';

export type OpenAIBuilderOptions = {
  client: OpenAIConfig;
  model?: string;
  applyPatch?: boolean;
  instructions?: string;
};

const DEFAULT_INSTRUCTIONS = [
  'You are the Codex-Ledger Builder.',
  'Return strict JSON with keys: summary (string) and diff (string).',
  'The diff must be a unified git patch with paths relative to the repo root.',
  'Do not wrap the JSON in markdown or code fences.',
].join('\n');

function tryParseJson(text: string): { summary?: string; diff?: string } | null {
  try {
    return JSON.parse(text) as { summary?: string; diff?: string };
  } catch {
    return null;
  }
}

function looksLikePatch(diff: string): boolean {
  const trimmed = diff.trim();
  return (
    trimmed.startsWith('diff --git') ||
    trimmed.startsWith('--- ') ||
    trimmed.startsWith('*** ')
  );
}

export class OpenAIBuilder implements Builder {
  private readonly options: OpenAIBuilderOptions;

  constructor(options: OpenAIBuilderOptions) {
    this.options = options;
  }

  async build(input: BuilderInput): Promise<BuilderOutput> {
    const client = createOpenAIClient(this.options.client);
    const model = this.options.model ?? this.options.client.model ?? 'gpt-4.1-mini';
    const response = await createTextResponse(client, {
      model,
      input: input.prompt,
      instructions: this.options.instructions ?? DEFAULT_INSTRUCTIONS,
    });

    const parsed = tryParseJson(response.outputText);
    const summary = parsed?.summary ?? 'LLM builder response';
    const diff = parsed?.diff ?? response.outputText;

    const apply = this.options.applyPatch ?? true;
    if (apply && looksLikePatch(diff)) {
      applyPatch(diff, { cwd: input.cwd });
    }

    return {
      didChange: apply && looksLikePatch(diff),
      summary,
      diff,
      llm: {
        model: response.model,
        usage: response.usage,
        requestId: response.requestId,
        reasoningEffort: (response as { reasoning?: { effort?: string } })?.reasoning?.effort,
      },
    };
  }
}
