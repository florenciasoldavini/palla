import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 0
    },
    queries: {
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60
    }
  }
});
