import type { DivergenceStatus } from './divergence';

export type TrackingPolicy = 'mirror-only' | 'rebase-ai' | 'merge-ai' | 'manual';

export type PolicyAction =
  | 'noop'
  | 'fast_forward_ai'
  | 'rebase_ai_on_human'
  | 'merge_human_into_ai'
  | 'pause_for_manual';

export type PolicyResolution = {
  policy: TrackingPolicy;
  divergenceStatus: DivergenceStatus;
  action: PolicyAction;
  reason: string;
};

export const DEFAULT_TRACKING_POLICY: TrackingPolicy = 'mirror-only';
const VALID_POLICIES: TrackingPolicy[] = ['mirror-only', 'rebase-ai', 'merge-ai', 'manual'];

export function isTrackingPolicy(value: string | undefined): value is TrackingPolicy {
  if (!value) {
    return false;
  }
  return VALID_POLICIES.includes(value as TrackingPolicy);
}

export function parseTrackingPolicy(
  value: string | undefined,
  fallback: TrackingPolicy = DEFAULT_TRACKING_POLICY
): TrackingPolicy {
  if (!value) {
    return fallback;
  }
  if (!isTrackingPolicy(value)) {
    throw new Error(
      `Invalid tracking policy "${value}". Expected one of: ${VALID_POLICIES.join(', ')}.`
    );
  }
  return value;
}

export function resolveTrackingPolicyAction(input: {
  policy?: TrackingPolicy;
  divergenceStatus: DivergenceStatus;
}): PolicyResolution {
  const policy = input.policy ?? DEFAULT_TRACKING_POLICY;
  const status = input.divergenceStatus;

  if (status === 'in_sync') {
    return {
      policy,
      divergenceStatus: status,
      action: 'noop',
      reason: 'Branches are already synchronized.',
    };
  }

  if (policy === 'manual') {
    return {
      policy,
      divergenceStatus: status,
      action: 'pause_for_manual',
      reason: 'Manual policy requires explicit user resolution for non-synced branches.',
    };
  }

  if (policy === 'mirror-only') {
    if (status === 'ahead_human') {
      return {
        policy,
        divergenceStatus: status,
        action: 'fast_forward_ai',
        reason: 'Mirror-only policy fast-forwards AI branch to human branch.',
      };
    }

    return {
      policy,
      divergenceStatus: status,
      action: 'pause_for_manual',
      reason: 'Mirror-only policy does not allow replaying or merging AI-only commits.',
    };
  }

  if (policy === 'rebase-ai') {
    if (status === 'ahead_human') {
      return {
        policy,
        divergenceStatus: status,
        action: 'fast_forward_ai',
        reason: 'AI branch is behind and can be fast-forwarded to human branch.',
      };
    }

    return {
      policy,
      divergenceStatus: status,
      action: 'rebase_ai_on_human',
      reason: 'Rebase policy replays AI-only commits on top of current human branch.',
    };
  }

  if (status === 'ahead_human') {
    return {
      policy,
      divergenceStatus: status,
      action: 'fast_forward_ai',
      reason: 'AI branch is behind and can be fast-forwarded to human branch.',
    };
  }

  return {
    policy,
    divergenceStatus: status,
    action: 'merge_human_into_ai',
    reason: 'Merge policy reconciles histories by merging human branch into AI branch.',
  };
}
