import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

interface Options {
  prefix?: string;
  defaultPage?: number;
  defaultPageSize?: number;
}

/**
 * Syncs pagination state (page + pageSize) with URL search params,
 * so the current view can be shared and restored from the URL.
 */
export const useUrlPagination = ({
  prefix = "",
  defaultPage = 1,
  defaultPageSize = 10,
}: Options = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageKey = prefix ? `${prefix}_page` : "page";
  const sizeKey = prefix ? `${prefix}_size` : "size";

  const page = useMemo(() => {
    const v = parseInt(searchParams.get(pageKey) || "", 10);
    return Number.isFinite(v) && v > 0 ? v : defaultPage;
  }, [searchParams, pageKey, defaultPage]);

  const pageSize = useMemo(() => {
    const v = parseInt(searchParams.get(sizeKey) || "", 10);
    return Number.isFinite(v) && v > 0 ? v : defaultPageSize;
  }, [searchParams, sizeKey, defaultPageSize]);

  const setPage = useCallback(
    (next: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === defaultPage) params.delete(pageKey);
          else params.set(pageKey, String(next));
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams, pageKey, defaultPage]
  );

  const setPageSize = useCallback(
    (next: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === defaultPageSize) params.delete(sizeKey);
          else params.set(sizeKey, String(next));
          // reset page when size changes
          params.delete(pageKey);
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams, sizeKey, pageKey, defaultPageSize]
  );

  const resetPage = useCallback(() => setPage(defaultPage), [setPage, defaultPage]);

  return { page, pageSize, setPage, setPageSize, resetPage };
};
