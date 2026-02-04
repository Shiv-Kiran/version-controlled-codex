import { ensureLedgerStore, writeTraceMarkdown, writeTraceMeta } from '../ledger';
import { hashPrompt } from '../ledger';
import {
  createOpenAIClient,
  createTextResponse,
  getCommitDiff,
  getCommitDiffStat,
  getCommitMessage,
  getCurrentBranch,
  getHeadCommitHash,
  getRepoRoot,
  updateRef,
} from '../infra';

type HookOptions = {
  cwd?: string;
};

const AI_PREFIX = 'ai/';
const MAX_DIFF_CHARS = 8000;

function buildSummary(message: string, diffStat: string): string {
  const trimmed = message.split('\n').find((line) => line.trim().length > 0) ?? 'Human commit';
  if (!diffStat) {
    return trimmed;
  }
  return `${trimmed} (${diffStat})`;
}

type LlmSummary = {
  summary: string;
  rationale: string;
  reviewer_notes?: string;
};

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function tryParseJson(text: string): LlmSummary | null {
  try {
    return JSON.parse(text) as LlmSummary;
  } catch {
    return null;
  }
}

async function summarizeWithLlm(input: {
  prompt: string;
  diff: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  extraContext?: string;
}): Promise<LlmSummary | null> {
  const client = createOpenAIClient({
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    organization: input.organization,
    project: input.project,
  });

  const instructions = [
    'You are a senior developer reviewing a human commit.',
    'Summarize the intent and rationale using the diff.',
    'Return strict JSON with keys: summary, rationale, reviewer_notes.',
    'summary: 1 short sentence. rationale: 2-4 sentences. reviewer_notes: optional bullet list.',
    'Do not wrap JSON in markdown or code fences.',
  ].join('\n');

  const payload = [
    'Commit message:',
    input.prompt,
    '',
    'Diff:',
    input.diff,
    '',
    input.extraContext ? `Extra context:\n${input.extraContext}` : '',
  ].join('\n');

  const response = await createTextResponse(client, {
    model: input.model,
    input: payload,
    instructions,
  });

  return tryParseJson(response.outputText);
}

export async function runPostCommit(options: HookOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  ensureLedgerStore(cwd);

  const currentBranch = getCurrentBranch({ cwd });
  if (currentBranch.startsWith(AI_PREFIX)) {
    return;
  }

  const commitHash = getHeadCommitHash({ cwd });
  const commitMessage = getCommitMessage(commitHash, { cwd });
  const diffStat = getCommitDiffStat(`${commitHash}~1`, commitHash, { cwd });
  const diff = truncate(getCommitDiff(`${commitHash}~1`, commitHash, { cwd }), MAX_DIFF_CHARS);
  const summary = buildSummary(commitMessage, diffStat);

  const useLlm = process.env.CODEX_LEDGER_USE_LLM_SUMMARY === '1';
  const llmModel = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const apiKey = process.env.OPENAI_API_KEY;
  const extraContext = process.env.CODEX_LEDGER_EXTRA_CONTEXT;

  let reasoning = `Human commit mirrored from branch ${currentBranch}.`;
  if (useLlm && apiKey) {
    try {
      const llmSummary = await summarizeWithLlm({
        prompt: commitMessage,
        diff,
        model: llmModel,
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        organization: process.env.OPENAI_ORGANIZATION,
        project: process.env.OPENAI_PROJECT,
        extraContext,
      });
      if (llmSummary?.rationale) {
        reasoning = llmSummary.rationale;
      }
    } catch {
      // Fall back to deterministic summary
    }
  }

  const promptHash = hashPrompt(commitMessage);
  const chatRefHash = extraContext ? hashPrompt(extraContext) : undefined;
  writeTraceMarkdown(
    commitHash,
    {
      summary,
      risk: 'Low',
      details: reasoning,
    },
    cwd
  );
  writeTraceMeta(
    {
      commitHash,
      sourceCommit: commitHash,
      sourceBranch: currentBranch,
      sessionId: `${currentBranch}-human`,
      promptHash,
      chatRefHash,
      createdAt: new Date().toISOString(),
    },
    cwd
  );

  const mirrorBranch = `${AI_PREFIX}${currentBranch}`;
  updateRef(`refs/heads/${mirrorBranch}`, commitHash, { cwd });
}

if (require.main === module) {
  const root = getRepoRoot();
  runPostCommit({ cwd: root }).catch(() => undefined);
}
