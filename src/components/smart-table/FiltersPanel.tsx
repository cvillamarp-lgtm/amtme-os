import React, { useState } from 'react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import type { FilterDef, FilterRule } from './types';

interface FiltersPanelProps {
  open: boolean;
  filterDefs: FilterDef[];
  activeFilters: FilterRule[];
  onAddFilter: (filter: FilterRule) => void;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
}

function makeId(field: string) {
  return `filter-${field}-${Date.now()}`;
}

export function FiltersPanel({
  open,
  filterDefs,
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  onClearAll,
}: FiltersPanelProps) {
  // Track multiselect checkbox state locally
  const [multiSelectState, setMultiSelectState] = useState<Record<string, string[]>>({});
  const [dateRangeState, setDateRangeState] = useState<Record<string, { min: string; max: string }>>({});
  const [numberRangeState, setNumberRangeState] = useState<Record<string, { min: string; max: string }>>({});

  const getActiveFilter = (field: string) =>
    activeFilters.find(f => f.field === field);

  const replaceFilter = (field: string, newFilter: FilterRule) => {
    const existing = getActiveFilter(field);
    if (existing) onRemoveFilter(existing.id);
    onAddFilter(newFilter);
  };

  const handleSelectChange = (def: FilterDef, value: string) => {
    if (!value || value === '__clear__') {
      const existing = getActiveFilter(def.field);
      if (existing) onRemoveFilter(existing.id);
      return;
    }
    const label = def.options?.find(o => o.value === value)?.label ?? value;
    replaceFilter(def.field, {
      id: makeId(def.field),
      field: def.field,
      operator: 'equals',
      value,
      label: `${def.label}: ${label}`,
    });
  };

  const handleMultiSelectChange = (def: FilterDef, optValue: string, checked: boolean) => {
    const current = multiSelectState[def.field] ?? [];
    const next = checked
      ? [...current, optValue]
      : current.filter(v => v !== optValue);

    setMultiSelectState(prev => ({ ...prev, [def.field]: next }));

    if (next.length === 0) {
      const existing = getActiveFilter(def.field);
      if (existing) onRemoveFilter(existing.id);
    } else {
      const labels = next.map(v => def.options?.find(o => o.value === v)?.label ?? v).join(', ');
      replaceFilter(def.field, {
        id: makeId(def.field),
        field: def.field,
        operator: 'in',
        value: next,
        label: `${def.label}: ${labels}`,
      });
    }
  };

  const applyDateRange = (def: FilterDef, min: string, max: string) => {
    if (!min && !max) {
      const existing = getActiveFilter(def.field);
      if (existing) onRemoveFilter(existing.id);
      return;
    }
    replaceFilter(def.field, {
      id: makeId(def.field),
      field: def.field,
      operator: 'range',
      value: { min: min || undefined, max: max || undefined },
      label: `${def.label}: ${min || '?'} — ${max || '?'}`,
    });
  };

  const applyNumberRange = (def: FilterDef, min: string, max: string) => {
    if (!min && !max) {
      const existing = getActiveFilter(def.field);
      if (existing) onRemoveFilter(existing.id);
      return;
    }
    replaceFilter(def.field, {
      id: makeId(def.field),
      field: def.field,
      operator: 'range',
      value: { min: min ? Number(min) : undefined, max: max ? Number(max) : undefined },
      label: `${def.label}: ${min || '?'} — ${max || '?'}`,
    });
  };

  const handleBooleanChange = (def: FilterDef, value: boolean) => {
    replaceFilter(def.field, {
      id: makeId(def.field),
      field: def.field,
      operator: 'equals',
      value,
      label: `${def.label}: ${value ? 'Sí' : 'No'}`,
    });
  };

  const handleExistsChange = (def: FilterDef, exists: boolean) => {
    replaceFilter(def.field, {
      id: makeId(def.field),
      field: def.field,
      operator: 'exists',
      value: exists,
      label: `${def.label}: ${exists ? 'Tiene' : 'No tiene'}`,
    });
  };

  return (
    <Collapsible open={open}>
      <CollapsibleContent>
        <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-4">
          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilters.map(f => (
                <Badge key={f.id} variant="secondary" className="gap-1 text-xs h-6 pl-2 pr-1">
                  {f.label || `${f.field}: ${JSON.stringify(f.value)}`}
                  <button
                    onClick={() => onRemoveFilter(f.id)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={onClearAll}
              >
                Limpiar todos
              </Button>
            </div>
          )}

          {/* Filter definitions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterDefs.map(def => (
              <div key={def.field} className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{def.label}</Label>

                {def.type === 'select' && (
                  <Select
                    value={getActiveFilter(def.field)?.value ?? ''}
                    onValueChange={(v) => handleSelectChange(def, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__" className="text-xs text-muted-foreground">Todos</SelectItem>
                      {def.options?.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {def.type === 'multiselect' && (
                  <div className="space-y-1.5 bg-background border border-border rounded-md p-2 max-h-32 overflow-y-auto">
                    {def.options?.map(opt => {
                      const checked = (multiSelectState[def.field] ?? []).includes(opt.value);
                      return (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`ms-${def.field}-${opt.value}`}
                            checked={checked}
                            onCheckedChange={(c) => handleMultiSelectChange(def, opt.value, !!c)}
                          />
                          <Label
                            htmlFor={`ms-${def.field}-${opt.value}`}
                            className="text-xs cursor-pointer"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {def.type === 'date_range' && (
                  <div className="flex gap-1.5">
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={dateRangeState[def.field]?.min ?? ''}
                      onChange={(e) => {
                        const min = e.target.value;
                        const max = dateRangeState[def.field]?.max ?? '';
                        setDateRangeState(prev => ({ ...prev, [def.field]: { min, max } }));
                        applyDateRange(def, min, max);
                      }}
                    />
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={dateRangeState[def.field]?.max ?? ''}
                      onChange={(e) => {
                        const max = e.target.value;
                        const min = dateRangeState[def.field]?.min ?? '';
                        setDateRangeState(prev => ({ ...prev, [def.field]: { min, max } }));
                        applyDateRange(def, min, max);
                      }}
                    />
                  </div>
                )}

                {def.type === 'number_range' && (
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="h-8 text-xs"
                      min={def.min}
                      max={def.max}
                      value={numberRangeState[def.field]?.min ?? ''}
                      onChange={(e) => {
                        const min = e.target.value;
                        const max = numberRangeState[def.field]?.max ?? '';
                        setNumberRangeState(prev => ({ ...prev, [def.field]: { min, max } }));
                        applyNumberRange(def, min, max);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      className="h-8 text-xs"
                      min={def.min}
                      max={def.max}
                      value={numberRangeState[def.field]?.max ?? ''}
                      onChange={(e) => {
                        const max = e.target.value;
                        const min = numberRangeState[def.field]?.min ?? '';
                        setNumberRangeState(prev => ({ ...prev, [def.field]: { min, max } }));
                        applyNumberRange(def, min, max);
                      }}
                    />
                  </div>
                )}

                {def.type === 'boolean' && (
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={getActiveFilter(def.field)?.value === true}
                      onCheckedChange={(v) => handleBooleanChange(def, v)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {getActiveFilter(def.field)?.value === true ? 'Sí' : 'No'}
                    </span>
                  </div>
                )}

                {def.type === 'exists' && (
                  <div className="flex gap-1.5">
                    <Button
                      variant={getActiveFilter(def.field)?.value === true ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-8 text-xs flex-1"
                      onClick={() => handleExistsChange(def, true)}
                    >
                      Tiene
                    </Button>
                    <Button
                      variant={getActiveFilter(def.field)?.value === false ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-8 text-xs flex-1"
                      onClick={() => handleExistsChange(def, false)}
                    >
                      No tiene
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
