type QueryScope = string | number | boolean | null | undefined;

function normalizeScope(
  scope: Record<string, QueryScope>,
): Record<string, QueryScope> {
  return Object.fromEntries(
    Object.entries(scope).filter(([, value]) => value !== undefined),
  );
}

export const dashboardQueryKeys = {
  endpoints: {
    all: ["endpoints"] as const,
  },
  settings: {
    all: ["settings"] as const,
  },
  suites: {
    all: ["suites"] as const,
  },
  runs: {
    all: ["runs"] as const,
    list: (
      scope: { apiBase?: string; limit?: number; offset?: string | null } = {},
    ) => ["runs", "list", normalizeScope(scope)] as const,
    detail: (runId: string) => ["runs", "detail", runId] as const,
    events: (runId: string) => ["runs", "events", runId] as const,
  },
  presets: {
    all: ["presets"] as const,
    list: () => ["presets", "list"] as const,
    detail: (presetId: string) => ["presets", "detail", presetId] as const,
  },
  comparisons: {
    all: ["comparisons"] as const,
    detail: (runIds: string[]) =>
      ["comparisons", "detail", [...runIds]] as const,
  },
};
