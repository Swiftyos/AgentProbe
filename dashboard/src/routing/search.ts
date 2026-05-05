import {
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";

export type CompareSearch = {
  runIds: string[];
  onlyChanges: boolean;
};

type RawSearch = Record<string, unknown>;

export function parseCompareSearch(search: string): CompareSearch {
  const raw = defaultParseSearch(
    search.startsWith("?") ? search : `?${search}`,
  ) as RawSearch;
  const runIds =
    typeof raw.run_ids === "string"
      ? raw.run_ids
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  return {
    runIds,
    onlyChanges: raw.only === "changes",
  };
}

export function comparePath(search: CompareSearch): string {
  return `/compare${defaultStringifySearch({
    run_ids: search.runIds.length > 0 ? search.runIds.join(",") : undefined,
    only: search.onlyChanges ? "changes" : undefined,
  })}`;
}
