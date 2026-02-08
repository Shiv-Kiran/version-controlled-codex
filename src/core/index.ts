export { ensureCleanWorkingTree, ensureGitRepo } from './git-guards';
export { resolveSessionPlan, formatDate, slugifyTask } from './session-plan';
export type { SessionIntent, SessionPlan } from './session-plan';
export {
  buildDiffReport,
  buildExplainReport,
  buildTimelineReport,
  renderDiffReport,
  renderExplainReport,
  renderTimelineReport,
} from './audit-reports';
export type {
  DiffReport,
  ExplainReport,
  TimelineEntry,
  TimelineReport,
} from './audit-reports';
export {
  detectBranchDivergence,
  getMirrorBranchName,
  inferHumanBranchFromAiBranch,
} from './divergence';
export type { DetectDivergenceOptions, DivergenceResult, DivergenceStatus } from './divergence';
export {
  DEFAULT_TRACKING_POLICY,
  isTrackingPolicy,
  parseTrackingPolicy,
  resolveTrackingPolicyAction,
} from './tracking-policy';
export type { PolicyAction, PolicyResolution, TrackingPolicy } from './tracking-policy';
export type { GitRunOptions, GitStatusSummary } from '../infra';
