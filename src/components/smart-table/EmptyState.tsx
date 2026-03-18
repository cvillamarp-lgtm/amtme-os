import React from 'react';
import { Button } from '@/components/ui/button';
import { Package, FilterX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function SmartEmptyState({
  title = 'Sin resultados',
  description = 'No hay elementos que mostrar',
  action,
  filtered = false,
  onClearFilters,
}: EmptyStateProps) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <FilterX className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sin resultados para los filtros aplicados</p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <Package className="h-10 w-10 text-muted-foreground/30" />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
