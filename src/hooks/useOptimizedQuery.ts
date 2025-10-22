import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Optimized query hook with automatic memoization
 */
export function useOptimizedQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>
) {
  // Memoize query key to prevent unnecessary re-renders
  const stableQueryKey = useMemo(
    () => options.queryKey,
    [JSON.stringify(options.queryKey)]
  );

  return useQuery<TData, TError>({
    ...options,
    queryKey: stableQueryKey as any,
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes default
  });
}
