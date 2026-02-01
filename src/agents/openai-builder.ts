import type { Builder, BuilderInput, BuilderOutput } from './builder';
import type { OpenAIConfig, OpenAIResponseText } from '../infra';
import { applyPatch, createOpenAIClient, createTextResponse } from '../infra';

export type OpenAIBuilderOptions = {
  client: OpenAIConfig;
  model?: string;
  applyPatch?: boolean;
  instructions?: string;
  maxRetries?: number;
};

const DEFAULT_INSTRUCTIONS = [
  'You are the Codex-Ledger Builder.',
  'Return strict JSON with keys: summary (string) and diff (string).',
  'The diff must be a unified git patch with paths relative to the repo root.',
  'Do not wrap the JSON in markdown or code fences.',
  'Example diff for a new file:',
  'diff --git a/NEW.md b/NEW.md',
  'new file mode 100644',
  'index 0000000..0000000',
  '--- /dev/null',
  '+++ b/NEW.md',
  '@@',
  '+Hello',
].join('\n');

function tryParseJson(text: string): { summary?: string; diff?: string } | null {
  try {
    return JSON.parse(text) as { summary?: string; diff?: string };
  } catch {
    return null;
  }
}

function extractJsonBlock(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1];
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
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
    const maxRetries = this.options.maxRetries ?? 1;
    const apply = this.options.applyPatch ?? true;
    let lastResponse: OpenAIResponseText | null = null;
    let lastOutput = '';

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const response = await createTextResponse(client, {
        model,
        input: input.prompt,
        instructions: this.options.instructions ?? DEFAULT_INSTRUCTIONS,
      });
      lastResponse = response;
      lastOutput = response.outputText;

      let parsed = tryParseJson(response.outputText);
      if (!parsed) {
        const extracted = extractJsonBlock(response.outputText);
        if (extracted) {
          parsed = tryParseJson(extracted);
        }
      }

      const summary = parsed?.summary ?? 'LLM builder response';
      const diff = parsed?.diff ?? response.outputText;
      const isPatch = looksLikePatch(diff);

      if (apply && isPatch) {
        applyPatch(diff, { cwd: input.cwd });
        return {
          didChange: true,
          summary,
          diff,
          rawOutput: response.outputText,
          llm: {
            model: response.model,
            usage: response.usage,
            requestId: response.requestId,
            reasoningEffort: (response as { reasoning?: { effort?: string } })?.reasoning
              ?.effort,
          },
        };
      }

      if (!isPatch && attempt < maxRetries) {
        continue;
      }

      return {
        didChange: false,
        summary,
        diff,
        rawOutput: response.outputText,
        llm: {
          model: response.model,
          usage: response.usage,
          requestId: response.requestId,
          reasoningEffort: (response as { reasoning?: { effort?: string } })?.reasoning
            ?.effort,
        },
      };
    }

    return {
      didChange: false,
      summary: 'LLM builder response',
      diff: lastOutput,
      rawOutput: lastOutput,
      llm: lastResponse
        ? {
            model: lastResponse.model,
            usage: lastResponse.usage,
            requestId: lastResponse.requestId,
            reasoningEffort: (lastResponse as { reasoning?: { effort?: string } })?.reasoning
              ?.effort,
          }
        : undefined,
    };
  }
}
