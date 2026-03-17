import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

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

export interface TablePreferences {
  sortRules: SortRule[];
  filters: FilterRule[];
  visibleColumns: string[];
  viewType: 'table' | 'grid' | 'grouped';
  groupBy?: string;
  itemsPerPage: number;
  currentPage: number;
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
}

export function useSmartTable<T extends { id: string }>(config: SmartTableConfig<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [prefs, setPrefs] = useState<TablePreferences>({
    sortRules: config.defaultSort || [],
    filters: config.defaultFilters || [],
    visibleColumns: config.columns.filter(c => c.visible !== false).map(c => c.id),
    viewType: 'table',
    itemsPerPage: 25,
    currentPage: 0,
  });

  useEffect(() => {
    if (!config.persistKey) return;
    try {
      const saved = localStorage.getItem(config.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPrefs(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error('Failed to load table preferences:', e);
    }
  }, [config.persistKey]);

  useEffect(() => {
    if (!config.persistKey) return;
    try {
      localStorage.setItem(config.persistKey, JSON.stringify(prefs));
      config.onPreferencesChange?.(prefs);
    } catch (e) {
      console.error('Failed to save table preferences:', e);
    }
  }, [prefs, config.persistKey, config.onPreferencesChange]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (prefs.sortRules.length > 0) {
      params.set('sort', JSON.stringify(prefs.sortRules));
    }
    if (prefs.filters.length > 0) {
      params.set('filters', JSON.stringify(prefs.filters));
    }
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    setSearchParams(params, { replace: true });
  }, [prefs.sortRules, prefs.filters, searchQuery, setSearchParams]);

  const sorted = useMemo(() => {
    let result = [...config.data];
    
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
        const matchesSearch = config.columns.some(col => {
          const val = col.getValue?.(item) ?? (item as any)[col.id];
          return val && String(val).toLowerCase().includes(searchLower);
        });
        if (!matchesSearch) return false;
      }

      return prefs.filters.every(filter => {
        const column = config.columns.find(c => c.id === filter.field);
        if (!column) return true;

        const val = column.getValue?.(item) ?? (item as any)[filter.field];

        switch (filter.operator) {
          case 'equals':
            return val === filter.value;
          case 'contains':
            return String(val || '').toLowerCase().includes(String(filter.value).toLowerCase());
          case 'range':
            return val >= filter.value.min && val <= filter.value.max;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(val);
          case 'exists':
            return filter.value ? val != null : val == null;
          default:
            return true;
        }
      });
    });
  }, [sorted, searchQuery, prefs.filters, config.columns]);

  const paginated = useMemo(() => {
    const start = prefs.currentPage * prefs.itemsPerPage;
    return filtered.slice(start, start + prefs.itemsPerPage);
  }, [filtered, prefs.currentPage, prefs.itemsPerPage]);

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
  }, [config.defaultSort]);

  const setViewType = useCallback((type: 'table' | 'grid' | 'grouped') => {
    setPrefs(prev => ({ ...prev, viewType: type }));
  }, []);

  const setGroupBy = useCallback((field: string | undefined) => {
    setPrefs(prev => ({ ...prev, groupBy: field }));
  }, []);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setPrefs(prev => ({
      ...prev,
      visibleColumns: prev.visibleColumns.includes(columnId)
        ? prev.visibleColumns.filter(id => id !== columnId)
        : [...prev.visibleColumns, columnId],
    }));
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setPrefs(prev => ({ ...prev, currentPage: page }));
  }, []);

  return {
    allData: config.data,
    filtered,
    paginated,
    prefs,
    searchQuery,
    setSearchQuery,
    setSortRule,
    currentSort: prefs.sortRules[0],
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
    currentPage: prefs.currentPage,
    totalPages: Math.ceil(filtered.length / prefs.itemsPerPage),
    setCurrentPage,
    hasNextPage: prefs.currentPage < Math.ceil(filtered.length / prefs.itemsPerPage) - 1,
    hasPrevPage: prefs.currentPage > 0,
    totalCount: config.data.length,
    filteredCount: filtered.length,
    displayedCount: paginated.length,
  };
}