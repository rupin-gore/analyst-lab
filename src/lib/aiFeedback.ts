/**
 * Hook for optional AI feedback on written answers. Disabled for now.
 *
 * To enable later: implement a provider (for example one that calls the Anthropic Messages API
 * with a key the user pastes into Settings and that is kept only in localStorage) and register
 * it with setFeedbackProvider(). The written and diagram workspaces already call
 * getFeedbackProvider() and show a "Get AI feedback" button whenever one is registered.
 */
export interface FeedbackRequest {
  labTitle: string;
  task: string;
  rubric: string[];
  answer: string;
  modelAnswer: string;
}

export interface FeedbackProvider {
  name: string;
  review(req: FeedbackRequest): Promise<string>;
}

let provider: FeedbackProvider | null = null;

export function setFeedbackProvider(p: FeedbackProvider | null): void {
  provider = p;
}

export function getFeedbackProvider(): FeedbackProvider | null {
  return provider;
}
