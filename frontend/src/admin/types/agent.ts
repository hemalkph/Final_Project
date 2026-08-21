/** Minimal shape needed for the Properties module's assignment dropdown. Backed by GET /api/agents/public. */
export interface AgentOption {
  id: number;
  name: string;
  email: string;
}
