export type BuilderInput = {
  prompt: string;
  cwd?: string;
  sessionId?: string;
};

export type BuilderOutput = {
  didChange: boolean;
  summary: string;
  diff: string;
  llm?: {
    model?: string;
    usage?: unknown;
    requestId?: string;
  };
};

export interface Builder {
  build: (input: BuilderInput) => Promise<BuilderOutput>;
}

export class NoopBuilder implements Builder {
  async build(_input: BuilderInput): Promise<BuilderOutput> {
    return {
      didChange: false,
      summary: 'Builder not implemented.',
      diff: '',
    };
  }
}
