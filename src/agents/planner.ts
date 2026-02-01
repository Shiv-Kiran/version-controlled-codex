import { resolveSessionPlan } from '../core';
import type { SessionPlan } from '../core';

export type PlannerInput = {
  task: string;
  currentBranch: string;
  explore?: boolean;
  baseBranch?: string;
  branchOverride?: string;
  sessionIdOverride?: string;
  date?: Date;
};

export type PlannerOutput = {
  plan: SessionPlan;
};

export interface Planner {
  plan: (input: PlannerInput) => Promise<PlannerOutput>;
}

export class BasicPlanner implements Planner {
  async plan(input: PlannerInput): Promise<PlannerOutput> {
    return {
      plan: resolveSessionPlan({
        task: input.task,
        currentBranch: input.currentBranch,
        explore: input.explore,
        baseBranch: input.baseBranch,
        branchOverride: input.branchOverride,
        sessionIdOverride: input.sessionIdOverride,
        date: input.date,
      }),
    };
  }
}
