export type ScribeInput = {
  prompt: string;
  diff: string;
  sessionId?: string;
};

export type ScribeOutput = {
  commitMessage: string;
  reasoning: string;
  llm?: {
    model?: string;
    usage?: unknown;
    requestId?: string;
  };
};

export interface Scribe {
  describe: (input: ScribeInput) => Promise<ScribeOutput>;
}

export class NoopScribe implements Scribe {
  async describe(_input: ScribeInput): Promise<ScribeOutput> {
    return {
      commitMessage: 'chore: placeholder',
      reasoning: 'Scribe not implemented.',
    };
  }
}
