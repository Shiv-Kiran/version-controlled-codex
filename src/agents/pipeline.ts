import type { Builder, BuilderOutput } from './builder';
import type { Planner, PlannerOutput } from './planner';
import type { Scribe, ScribeOutput } from './scribe';
import { BasicPlanner } from './planner';
import { NoopBuilder } from './builder';
import { NoopScribe } from './scribe';

export type AgentPipelineInput = {
  prompt: string;
  currentBranch: string;
  explore?: boolean;
  baseBranch?: string;
  branchOverride?: string;
  sessionIdOverride?: string;
};

export type AgentPipelineOutput = {
  planner: PlannerOutput;
  builder: BuilderOutput;
  scribe?: ScribeOutput;
};

export async function runAgentPipeline(
  input: AgentPipelineInput,
  deps?: {
    planner?: Planner;
    builder?: Builder;
    scribe?: Scribe;
  }
): Promise<AgentPipelineOutput> {
  const planner = deps?.planner ?? new BasicPlanner();
  const builder = deps?.builder ?? new NoopBuilder();
  const scribe = deps?.scribe ?? new NoopScribe();

  const plannerResult = await planner.plan({
    task: input.prompt,
    currentBranch: input.currentBranch,
    explore: input.explore,
    baseBranch: input.baseBranch,
    branchOverride: input.branchOverride,
    sessionIdOverride: input.sessionIdOverride,
  });

  const builderResult = await builder.build({
    prompt: input.prompt,
    sessionId: plannerResult.plan.sessionId,
  });

  if (!builderResult.didChange) {
    return { planner: plannerResult, builder: builderResult };
  }

  const scribeResult = await scribe.describe({
    prompt: input.prompt,
    diff: builderResult.diff,
    sessionId: plannerResult.plan.sessionId,
  });

  return {
    planner: plannerResult,
    builder: builderResult,
    scribe: scribeResult,
  };
}
