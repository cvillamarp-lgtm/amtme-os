import type { FilterRule, SortRule, SavedView } from '@/hooks/useSmartTable';

export type { FilterRule, SortRule, SavedView };

export interface FilterDef {
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'date_range' | 'number_range' | 'boolean' | 'exists';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}
