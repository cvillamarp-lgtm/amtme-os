import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  Table2,
  LayoutGrid,
  Columns,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { FilterRule, SortOption } from './types';

interface ListingToolbarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  sortOptions: SortOption[];
  currentSort?: { field: string; direction: 'asc' | 'desc' | null };
  onSortChange: (field: string, direction: 'asc' | 'desc' | null) => void;
  filters: FilterRule[];
  onClearFilters: () => void;
  onRemoveFilter?: (id: string) => void;
  totalCount: number;
  filteredCount: number;
  filtersOpen: boolean;
  onFiltersToggle: () => void;
  viewType?: 'table' | 'grid' | 'grouped';
  onViewTypeChange?: (v: 'table' | 'grid' | 'grouped') => void;
  showViewToggle?: boolean;
  columns?: Array<{ id: string; label: string; visible: boolean }>;
  onToggleColumn?: (id: string) => void;
  children?: React.ReactNode;
}

export function ListingToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  sortOptions,
  currentSort,
  onSortChange,
  filters,
  onClearFilters,
  onRemoveFilter,
  totalCount,
  filteredCount,
  filtersOpen,
  onFiltersToggle,
  viewType = 'table',
  onViewTypeChange,
  showViewToggle = false,
  columns,
  onToggleColumn,
  children,
}: ListingToolbarProps) {
  const activeFilterCount = filters.length;

  const handleSortClick = (field: string) => {
    if (!currentSort || currentSort.field !== field) {
      onSortChange(field, 'asc');
    } else if (currentSort.direction === 'asc') {
      onSortChange(field, 'desc');
    } else {
      onSortChange(field, null);
    }
  };

  const getSortIcon = (field: string) => {
    if (!currentSort || currentSort.field !== field) return null;
    return currentSort.direction === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-2">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        {sortOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {currentSort ? (
                  <span className="text-xs">
                    {sortOptions.find(o => o.value === currentSort.field)?.label}
                    {currentSort.direction === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                ) : (
                  <span className="text-xs">Ordenar</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {sortOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleSortClick(opt.value)}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{opt.label}</span>
                  {getSortIcon(opt.value)}
                </DropdownMenuItem>
              ))}
              {currentSort && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onSortChange(currentSort.field, null)}
                    className="text-sm text-muted-foreground"
                  >
                    Quitar orden
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Filters toggle */}
        <Button
          variant={filtersOpen ? 'secondary' : 'outline'}
          size="sm"
          className="h-9 gap-1.5"
          onClick={onFiltersToggle}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs">Filtros</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* View toggle */}
        {showViewToggle && onViewTypeChange && (
          <div className="flex border border-border rounded-md overflow-hidden h-9">
            <button
              onClick={() => onViewTypeChange('table')}
              className={`px-2.5 flex items-center transition-colors ${
                viewType === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewTypeChange('grid')}
              className={`px-2.5 flex items-center border-l border-border transition-colors ${
                viewType === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Column visibility */}
        {columns && onToggleColumn && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Columns className="h-3.5 w-3.5" />
                <span className="text-xs">Columnas</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                {columns.map((col) => (
                  <div key={col.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                    onClick={() => onToggleColumn(col.id)}
                  >
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={col.visible}
                      onCheckedChange={() => onToggleColumn(col.id)}
                    />
                    <Label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer">{col.label}</Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Right slot for children (e.g., "New X" button) */}
        {children && (
          <div className="ml-auto flex items-center gap-2">
            {children}
          </div>
        )}
      </div>

      {/* Filter chips row */}
      {(filters.length > 0 || (totalCount !== filteredCount)) && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <Badge
              key={f.id}
              variant="secondary"
              className="gap-1 text-xs h-6 pl-2 pr-1"
            >
              {f.label || `${f.field}: ${JSON.stringify(f.value)}`}
              <button
                onClick={() => onRemoveFilter ? onRemoveFilter(f.id) : onClearFilters()}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.length > 1 && (
            <button
              onClick={onClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Limpiar todos
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredCount} de {totalCount} resultados
          </span>
        </div>
      )}
    </div>
  );
}
