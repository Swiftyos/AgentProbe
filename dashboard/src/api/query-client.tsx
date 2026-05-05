import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function createDashboardQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5_000,
      },
    },
  });
}

const dashboardQueryClient = createDashboardQueryClient();

export function DashboardQueryProvider({
  children,
  client = dashboardQueryClient,
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
