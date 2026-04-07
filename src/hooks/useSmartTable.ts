import { useState, useEffect, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type FilterOperator = 'equals' | 'contains' | 'range' | 'in' | 'exists';

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  label?: string;
}

export interface SortRule {
  field: string;
  direction: SortDirection;
}

export interface SavedView {
  id: string;
  name: string;
  filters: FilterRule[];
  sortRules: SortRule[];
  visibleColumns: string[];
  viewType: 'table' | 'grid' | 'grouped';
  isDefault?: boolean;
}

export interface TablePreferences {
  sortRules: SortRule[];
  filters: FilterRule[];
  visibleColumns: string[];
  viewType: 'table' | 'grid' | 'grouped';
  groupBy?: string;
  itemsPerPage: number;
  currentPage: number;
  columnOrder: string[];
}

export interface SmartTableConfig<T> {
  data: T[];
  columns: {
    id: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    visible?: boolean;
    getValue?: (item: T) => any;
  }[];
  defaultSort?: SortRule[];
  defaultFilters?: FilterRule[];
  onPreferencesChange?: (prefs: TablePreferences) => void;
  persistKey?: string;
  searchFields?: string[];
  pageSize?: number;
  defaultViewType?: 'table' | 'grid' | 'grouped';
  defaultViews?: SavedView[];
}

export function useSmartTable<T extends { id: string }>(config: SmartTableConfig<T>) {
  const defaultItemsPerPage = config.pageSize ?? 50;
  const defaultViewType = config.defaultViewType ?? 'table';

  const [searchQuery, setSearchQuery] = useState('');
  const [prefs, setPrefs] = useState<TablePreferences>(() => ({
    sortRules: config.defaultSort || [],
    filters: config.defaultFilters || [],
    visibleColumns: config.columns.filter(c => c.visible !== false).map(c => c.id),
    viewType: defaultViewType,
    itemsPerPage: defaultItemsPerPage,
    currentPage: 0,
    columnOrder: config.columns.map(c => c.id),
  }));

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Views state
  const [views, setViews] = useState<SavedView[]>(config.defaultViews || []);
  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    const defaultView = (config.defaultViews || []).find(v => v.isDefault);
    return defaultView?.id ?? null;
  });

  // Load persisted prefs
  useEffect(() => {
    if (!config.persistKey) return;
    try {
      const saved = localStorage.getItem(config.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPrefs(prev => ({
          ...prev,
          ...parsed,
          columnOrder: parsed.columnOrder?.length ? parsed.columnOrder : prev.columnOrder,
        }));
      }
      const savedViews = localStorage.getItem(`${config.persistKey}:views`);
      if (savedViews) {
        const parsedViews = JSON.parse(savedViews);
        setViews(parsedViews);
      }
    } catch (e) {
      // Error loading table preferences - will use defaults
    }
  }, [config.persistKey]);

  // Persist prefs
  useEffect(() => {
    if (!config.persistKey) return;
    try {
      localStorage.setItem(config.persistKey, JSON.stringify(prefs));
      config.onPreferencesChange?.(prefs);
    } catch (e) {
      // Error saving preferences to localStorage - preferences still function in-memory
    }
  }, [prefs, config.persistKey, config.onPreferencesChange, config]);

  // Persist views
  useEffect(() => {
    if (!config.persistKey) return;
    try {
      localStorage.setItem(`${config.persistKey}:views`, JSON.stringify(views));
    } catch (e) {
      // Error persisting views - views still available in-memory
    }
  }, [views, config.persistKey, config]);

  // Determine search columns
  const searchColumns = useMemo(() => {
    if (config.searchFields && config.searchFields.length > 0) {
      return config.columns.filter(c => config.searchFields!.includes(c.id));
    }
    return config.columns;
  }, [config.columns, config.searchFields]);

  const sorted = useMemo(() => {
    const result = [...config.data];

    for (const sort of prefs.sortRules) {
      const column = config.columns.find(c => c.id === sort.field);
      if (!column || !sort.direction) continue;

      result.sort((a, b) => {
        const aVal = column.getValue?.(a) ?? (a as any)[sort.field];
        const bVal = column.getValue?.(b) ?? (b as any)[sort.field];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = String(aVal).localeCompare(String(bVal), 'es', { numeric: true });
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [config.data, prefs.sortRules, config.columns]);

  const filtered = useMemo(() => {
    return sorted.filter(item => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchColumns.some(col => {
          const val = col.getValue?.(item) ?? (item as any)[col.id];
          return val && String(val).toLowerCase().includes(searchLower);
        });
        if (!matchesSearch) return false;
      }

      return prefs.filters.every(filter => {
        const column = config.columns.find(c => c.id === filter.field);
        // If no column def, try raw field access
        const val = column
          ? (column.getValue?.(item) ?? (item as any)[filter.field])
          : (item as any)[filter.field];

        switch (filter.operator) {
          case 'equals':
            return val === filter.value;
          case 'contains':
            return String(val || '').toLowerCase().includes(String(filter.value).toLowerCase());
          case 'range':
            if (filter.value?.min !== undefined && filter.value?.max !== undefined) {
              return val >= filter.value.min && val <= filter.value.max;
            }
            if (filter.value?.min !== undefined) return val >= filter.value.min;
            if (filter.value?.max !== undefined) return val <= filter.value.max;
            return true;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(val);
          case 'exists':
            return filter.value ? val != null && val !== '' : val == null || val === '';
          default:
            return true;
        }
      });
    });
  }, [sorted, searchQuery, prefs.filters, config.columns, searchColumns]);

  const paginated = useMemo(() => {
    const start = prefs.currentPage * prefs.itemsPerPage;
    return filtered.slice(start, start + prefs.itemsPerPage);
  }, [filtered, prefs.currentPage, prefs.itemsPerPage]);

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map(item => item.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(
    () => filtered.length > 0 && filtered.every(item => selectedIds.has(item.id)),
    [filtered, selectedIds]
  );

  const isIndeterminate = useMemo(
    () => !isAllSelected && filtered.some(item => selectedIds.has(item.id)),
    [filtered, selectedIds, isAllSelected]
  );

  // ── Sort / Filter ──────────────────────────────────────────────────────────

  const setSortRule = useCallback((field: string, direction: SortDirection) => {
    setPrefs(prev => ({
      ...prev,
      sortRules: direction ? [{ field, direction }] : [],
      currentPage: 0,
    }));
  }, []);

  const addFilter = useCallback((filter: FilterRule) => {
    setPrefs(prev => ({
      ...prev,
      filters: [...prev.filters, filter],
      currentPage: 0,
    }));
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setPrefs(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId),
      currentPage: 0,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      filters: [],
      sortRules: config.defaultSort || [],
      currentPage: 0,
    }));
    setSearchQuery('');
  }, [config.defaultSort]);

  // ── View type ──────────────────────────────────────────────────────────────

  const setViewType = useCallback((type: 'table' | 'grid' | 'grouped') => {
    setPrefs(prev => ({ ...prev, viewType: type }));
  }, []);

  const setGroupBy = useCallback((field: string | undefined) => {
    setPrefs(prev => ({ ...prev, groupBy: field }));
  }, []);

  // ── Columns ────────────────────────────────────────────────────────────────

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setPrefs(prev => ({
      ...prev,
      visibleColumns: prev.visibleColumns.includes(columnId)
        ? prev.visibleColumns.filter(id => id !== columnId)
        : [...prev.visibleColumns, columnId],
    }));
  }, []);

  const reorderColumns = useCallback((from: number, to: number) => {
    setPrefs(prev => {
      const order = [...prev.columnOrder];
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      return { ...prev, columnOrder: order };
    });
  }, []);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const setCurrentPage = useCallback((page: number) => {
    setPrefs(prev => ({ ...prev, currentPage: page }));
  }, []);

  // ── Saved Views ────────────────────────────────────────────────────────────

  const saveView = useCallback((name: string) => {
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      filters: prefs.filters,
      sortRules: prefs.sortRules,
      visibleColumns: prefs.visibleColumns,
      viewType: prefs.viewType,
    };
    setViews(prev => [...prev, newView]);
    setActiveViewId(newView.id);
  }, [prefs]);

  const applyView = useCallback((viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return;
    setPrefs(prev => ({
      ...prev,
      filters: view.filters,
      sortRules: view.sortRules,
      visibleColumns: view.visibleColumns,
      viewType: view.viewType,
      currentPage: 0,
    }));
    setActiveViewId(viewId);
  }, [views]);

  const deleteView = useCallback((viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId));
    if (activeViewId === viewId) setActiveViewId(null);
  }, [activeViewId]);

  const resetToDefault = useCallback(() => {
    setPrefs({
      sortRules: config.defaultSort || [],
      filters: config.defaultFilters || [],
      visibleColumns: config.columns.filter(c => c.visible !== false).map(c => c.id),
      viewType: defaultViewType,
      itemsPerPage: defaultItemsPerPage,
      currentPage: 0,
      columnOrder: config.columns.map(c => c.id),
    });
    setSearchQuery('');
    setActiveViewId(null);
    clearSelection();
  }, [config.defaultSort, config.defaultFilters, config.columns, defaultViewType, defaultItemsPerPage, clearSelection]);

  return {
    allData: config.data,
    filtered,
    paginated,
    prefs,
    searchQuery,
    setSearchQuery,
    setSortRule,
    currentSort: prefs.sortRules[0] as SortRule | undefined,
    filters: prefs.filters,
    addFilter,
    removeFilter,
    clearFilters,
    viewType: prefs.viewType,
    setViewType,
    groupBy: prefs.groupBy,
    setGroupBy,
    visibleColumns: config.columns.filter(c => prefs.visibleColumns.includes(c.id)),
    toggleColumnVisibility,
    columnOrder: prefs.columnOrder,
    reorderColumns,
    currentPage: prefs.currentPage,
    totalPages: Math.ceil(filtered.length / prefs.itemsPerPage),
    setCurrentPage,
    hasNextPage: prefs.currentPage < Math.ceil(filtered.length / prefs.itemsPerPage) - 1,
    hasPrevPage: prefs.currentPage > 0,
    totalCount: config.data.length,
    filteredCount: filtered.length,
    displayedCount: paginated.length,
    // Selection
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    // Views
    views,
    activeViewId,
    saveView,
    applyView,
    deleteView,
    resetToDefault,
  };
}
