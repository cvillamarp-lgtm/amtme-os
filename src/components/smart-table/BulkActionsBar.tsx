import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { BulkAction } from './types';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  actions: BulkAction[];
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  isAllSelected,
  actions,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground h-12 px-4 flex items-center gap-3 rounded-lg shadow-lg">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
      </span>

      {!isAllSelected && (
        <button
          onClick={onSelectAll}
          className="text-xs text-primary-foreground/80 hover:text-primary-foreground underline underline-offset-2 whitespace-nowrap transition-colors"
        >
          Seleccionar todos ({totalCount})
        </button>
      )}

      <button
        onClick={onClearSelection}
        className="text-xs text-primary-foreground/80 hover:text-primary-foreground underline underline-offset-2 whitespace-nowrap transition-colors"
      >
        Deseleccionar
      </button>

      {actions.length > 0 && (
        <>
          <Separator orientation="vertical" className="h-5 bg-primary-foreground/30" />
          <div className="flex items-center gap-2">
            {actions.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
                className="h-7 text-xs gap-1.5"
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
