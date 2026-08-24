export function validateAgentEndpoint(raw: string, resolver?: (hostname: string, options: { all: true; verbatim: true }) => Promise<{ address: string; family: number }[]>): Promise<URL>
export function parseExternalManifest(value: unknown, endpoint: string): { id: string; name: string; strategy: string; adapter: 'canary-agent/v1' | 'http-reference/v1'; provenance: string; capabilities: string[] }
export function parseExternalProposal(value: unknown): { allocationPct: number; expectedYieldPct: number; maxSlippageBps: number; protocol: string }
