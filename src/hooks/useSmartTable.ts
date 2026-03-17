import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc";

export interface SortRule {
  column: string;
  direction: SortDirection;
}

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "gte"
  | "lte"
  | "in"
  | "range"
  | "exists"
  | "notExists";

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
  label?: string;
}

export type ViewType = "table" | "cards" | "grouped";

export interface ColumnDef<T> {
  id: string;
  label: string;
  getValue: (item: T) => unknown;
  sortable?: boolean;
  hideable?: boolean;
  defaultVisible?: boolean;
}

export interface UseSmartTableOptions<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchFields?: Array<(item: T) => string | null | undefined>;
  defaultSort?: SortRule[];
  defaultView?: ViewType;
  persistKey?: string;
  pageSize?: number;
}

export interface UseSmartTableReturn<T> {
  // Data
  allData: T[];
  filtered: T[];
  paginated: T[];

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Sort
  sort: SortRule[];
  setSortColumn: (column: string) => void;
  clearSort: () => void;

  // Filters
  filters: FilterRule[];
  addFilter: (filter: Omit<FilterRule, "id">) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;

  // View
  viewType: ViewType;
  setViewType: (v: ViewType) => void;

  // Columns
  visibleColumns: string[];
  toggleColumn: (id: string) => void;

  // Pagination
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  setPage: (p: number) => void;

  // Stats
  totalCount: number;
  filteredCount: number;
  displayedCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).toLowerCase();
}

function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  const aStr = getStr(a);
  const bStr = getStr(b);

  // Numeric comparison when both parse as non-NaN and non-empty numbers
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNumeric = !isNaN(aNum) && aStr !== "" && typeof a !== "boolean";
  const bIsNumeric = !isNaN(bNum) && bStr !== "" && typeof b !== "boolean";
  const bothNumeric = aIsNumeric && bIsNumeric;

  let result: number;
  if (bothNumeric) {
    result = aNum - bNum;
  } else {
    result = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  }
  return direction === "asc" ? result : -result;
}

function applyFilter<T>(item: T, filter: FilterRule, col: ColumnDef<T> | undefined): boolean {
  const rawVal = col ? col.getValue(item) : (item as Record<string, unknown>)[filter.field];
  const { operator, value } = filter;

  switch (operator) {
    case "eq":
      return getStr(rawVal) === getStr(value);
    case "neq":
      return getStr(rawVal) !== getStr(value);
    case "contains":
      return getStr(rawVal).includes(getStr(value));
    case "gte": {
      const n = Number(rawVal);
      return !isNaN(n) && n >= Number(value);
    }
    case "lte": {
      const n = Number(rawVal);
      return !isNaN(n) && n <= Number(value);
    }
    case "in": {
      const arr = Array.isArray(value) ? value : [value];
      return arr.map(getStr).includes(getStr(rawVal));
    }
    case "range": {
      const n = Number(rawVal);
      if (isNaN(n)) return false;
      const [min, max] = Array.isArray(value) ? value : [value, value];
      return n >= Number(min) && n <= Number(max);
    }
    case "exists":
      return rawVal !== null && rawVal !== undefined && rawVal !== "";
    case "notExists":
      return rawVal === null || rawVal === undefined || rawVal === "";
    default:
      return true;
  }
}

function persist(key: string, state: Record<string, unknown>) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.warn("[useSmartTable] Failed to persist state to localStorage:", err);
  }
}

function restore<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn("[useSmartTable] Failed to restore state from localStorage:", err);
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSmartTable<T>({
  data,
  columns,
  searchFields,
  defaultSort = [],
  defaultView = "table",
  persistKey,
  pageSize = 50,
}: UseSmartTableOptions<T>): UseSmartTableReturn<T> {
  // ── Restore persisted state ─────────────────────────────────────────────────
  const saved = useRef(
    persistKey
      ? restore<{
          sort?: SortRule[];
          filters?: FilterRule[];
          viewType?: ViewType;
          visibleColumns?: string[];
        }>(persistKey)
      : null
  );

  const defaultVisibleColumns = columns
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.id);

  // ── State ───────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [sort, setSort] = useState<SortRule[]>(saved.current?.sort ?? defaultSort);
  const [filters, setFilters] = useState<FilterRule[]>(saved.current?.filters ?? []);
  const [viewType, setViewTypeRaw] = useState<ViewType>(
    saved.current?.viewType ?? defaultView
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    saved.current?.visibleColumns ?? defaultVisibleColumns
  );
  const [currentPage, setPage] = useState(1);

  // ── Persist on change ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!persistKey) return;
    persist(persistKey, { sort, filters, viewType, visibleColumns });
  }, [persistKey, sort, filters, viewType, visibleColumns]);

  // Reset to page 1 when data/search/filter/sort changes
  const resetPage = useCallback(() => setPage(1), []);

  // ── Search ───────────────────────────────────────────────────────────────────
  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryRaw(q);
      resetPage();
    },
    [resetPage]
  );

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const setSortColumn = useCallback(
    (column: string) => {
      setSort((prev) => {
        const existing = prev.find((s) => s.column === column);
        if (!existing) return [{ column, direction: "asc" }];
        if (existing.direction === "asc") return [{ column, direction: "desc" }];
        // third click: remove sort
        return prev.filter((s) => s.column !== column);
      });
      resetPage();
    },
    [resetPage]
  );

  const clearSort = useCallback(() => {
    setSort([]);
    resetPage();
  }, [resetPage]);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const addFilter = useCallback(
    (filter: Omit<FilterRule, "id">) => {
      const id = `${filter.field}-${Date.now()}`;
      setFilters((prev) => [...prev, { ...filter, id }]);
      resetPage();
    },
    [resetPage]
  );

  const removeFilter = useCallback(
    (id: string) => {
      setFilters((prev) => prev.filter((f) => f.id !== id));
      resetPage();
    },
    [resetPage]
  );

  const clearFilters = useCallback(() => {
    setFilters([]);
    setSearchQueryRaw("");
    resetPage();
  }, [resetPage]);

  // ── View ──────────────────────────────────────────────────────────────────────
  const setViewType = useCallback((v: ViewType) => setViewTypeRaw(v), []);

  // ── Column visibility ─────────────────────────────────────────────────────────
  const toggleColumn = useCallback((id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  // ── Derived: filtered & sorted data ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = data;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const getters = searchFields ?? columns.map((c) => (item: T) => String(c.getValue(item) ?? ""));
      result = result.filter((item) =>
        getters.some((fn) => {
          const val = fn(item);
          return val ? String(val).toLowerCase().includes(q) : false;
        })
      );
    }

    // Filters
    if (filters.length > 0) {
      const colMap = new Map(columns.map((c) => [c.id, c]));
      result = result.filter((item) =>
        filters.every((f) => applyFilter(item, f, colMap.get(f.field)))
      );
    }

    // Sort
    if (sort.length > 0) {
      const colMap = new Map(columns.map((c) => [c.id, c]));
      result = [...result].sort((a, b) => {
        for (const s of sort) {
          const col = colMap.get(s.column);
          const aVal = col ? col.getValue(a) : (a as Record<string, unknown>)[s.column];
          const bVal = col ? col.getValue(b) : (b as Record<string, unknown>)[s.column];
          const cmp = compareValues(aVal, bVal, s.direction);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, filters, sort, columns, searchFields]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  return {
    allData: data,
    filtered,
    paginated,

    searchQuery,
    setSearchQuery,

    sort,
    setSortColumn,
    clearSort,

    filters,
    addFilter,
    removeFilter,
    clearFilters,

    viewType,
    setViewType,

    visibleColumns,
    toggleColumn,

    currentPage: safeCurrentPage,
    totalPages,
    hasNext: safeCurrentPage < totalPages,
    hasPrev: safeCurrentPage > 1,
    setPage,

    totalCount: data.length,
    filteredCount: filtered.length,
    displayedCount: paginated.length,
  };
}
