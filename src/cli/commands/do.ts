import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import { ensureCleanWorkingTree, ensureGitRepo, resolveSessionPlan } from '../../core';
import {
  addChanges,
  checkoutBranch,
  commitChanges,
  getCurrentBranch,
  getDiff,
  getHeadCommitHash,
} from '../../infra';
import { OpenAIBuilder, OpenAIScribe } from '../../agents';
import { hashPrompt, upsertSession, writeTraceMarkdown, writeTraceMeta } from '../../ledger';

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

export default class DoCommand extends BaseCommand {
  static summary = 'Execute an AI-assisted change.';
  static description =
    'Run the agent loop for the given prompt and apply changes to the working tree.';
  static examples = [
    '<%= config.bin %> do "refactor login"',
    '<%= config.bin %> do "refactor login" --explore',
    '<%= config.bin %> do "refactor login" --session ai-2026-02-01-001',
  ];

  static args = {
    prompt: Args.string({
      required: true,
      description: 'Instruction for the agent',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
    explore: Flags.boolean({
      default: false,
      description: 'Run in explore mode',
    }),
    session: Flags.string({
      description: 'Explicit session identifier to reuse',
    }),
    confirm: Flags.boolean({
      default: false,
      description: 'Require explicit confirmation before applying changes',
    }),
    dryRun: Flags.boolean({
      default: false,
      description: 'Compute changes without modifying files',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DoCommand);
    const { config, logger } = this.loadContext(flags);
    const cwd = process.cwd();

    ensureGitRepo({ cwd });
    ensureCleanWorkingTree({ cwd });

    const currentBranch = getCurrentBranch({ cwd });
    const plan = resolveSessionPlan({
      task: args.prompt,
      currentBranch,
      explore: flags.explore,
      sessionIdOverride: flags.session,
    });

    if (plan.action === 'create') {
      if (plan.baseBranch !== currentBranch) {
        checkoutBranch(plan.baseBranch, { cwd });
      }
      checkoutBranch(plan.branchName, { cwd, create: true });
      logger.info(`Created session branch ${plan.branchName}`);
    }

    const builder = new OpenAIBuilder({
      client: {
        apiKey: config.openai?.apiKey,
        baseUrl: config.openai?.baseUrl,
        organization: config.openai?.organization,
        project: config.openai?.project,
        model: config.openai?.model,
      },
      model: config.openai?.model,
      applyPatch: !flags.dryRun,
    });

    const builderResult = await builder.build({
      prompt: args.prompt,
      cwd,
      sessionId: plan.sessionId,
    });

    if (!builderResult.didChange) {
      logger.warn('Builder did not produce a valid patch.');
      if (builderResult.rawOutput) {
        logger.info(`Builder output (truncated): ${truncate(builderResult.rawOutput, 600)}`);
      }
      return;
    }

    if (flags.dryRun) {
      logger.info('Dry run enabled. Skipping commit and trace write.');
      logger.info(`Builder summary: ${builderResult.summary}`);
      if (builderResult.diff) {
        logger.info(`Builder diff (truncated): ${truncate(builderResult.diff, 600)}`);
      }
      return;
    }

    addChanges({ cwd });
    const diff = getDiff({ cwd, staged: true });
    if (!diff.trim()) {
      logger.info('No diff detected after staging changes.');
      return;
    }

    const scribe = new OpenAIScribe({
      client: {
        apiKey: config.openai?.apiKey,
        baseUrl: config.openai?.baseUrl,
        organization: config.openai?.organization,
        project: config.openai?.project,
        model: config.openai?.model,
      },
      model: config.openai?.model,
    });

    const scribeResult = await scribe.describe({
      prompt: args.prompt,
      diff,
      sessionId: plan.sessionId,
    });

    commitChanges({ cwd, message: scribeResult.commitMessage });
    const commitHash = getHeadCommitHash({ cwd });

    const promptHash = hashPrompt(args.prompt);
    writeTraceMarkdown(
      commitHash,
      {
        summary: builderResult.summary,
        risk: 'Low',
        details: scribeResult.reasoning,
      },
      cwd
    );
    writeTraceMeta(
      {
        commitHash,
        sessionId: plan.sessionId,
        promptHash,
        createdAt: new Date().toISOString(),
        model: scribeResult.llm?.model ?? builderResult.llm?.model,
        llm: scribeResult.llm ?? builderResult.llm,
        builderLlm: builderResult.llm,
        scribeLlm: scribeResult.llm,
      },
      cwd
    );

    upsertSession(
      {
        sessionId: plan.sessionId,
        branch: plan.branchName,
        startedAt: new Date().toISOString(),
        lastPromptSummary: builderResult.summary,
        status: 'active',
      },
      cwd
    );

    logger.info(`Committed to ${plan.branchName} as ${commitHash}: ${scribeResult.commitMessage}`);
    if (flags.confirm) {
      logger.info('Confirm flag is currently informational only.');
    }
  }
}