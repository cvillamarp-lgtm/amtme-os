import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, X, ChevronDown, RotateCcw } from 'lucide-react';
import type { SavedView } from './types';

interface ViewsTabsProps {
  views: SavedView[];
  activeViewId: string | null;
  onApplyView: (id: string) => void;
  onSaveView: (name: string) => void;
  onDeleteView: (id: string) => void;
  onReset: () => void;
}

export function ViewsTabs({
  views,
  activeViewId,
  onApplyView,
  onSaveView,
  onDeleteView,
  onReset,
}: ViewsTabsProps) {
  const [addingView, setAddingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const handleSave = () => {
    if (!newViewName.trim()) return;
    onSaveView(newViewName.trim());
    setNewViewName('');
    setAddingView(false);
  };

  if (views.length === 0 && !addingView) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAddingView(true)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-2 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Guardar vista
        </button>
        <button
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar
        </button>
        {addingView && (
          <div className="flex items-center gap-1.5">
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Nombre de la vista"
              className="h-7 text-xs w-36"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setAddingView(false); setNewViewName(''); }
              }}
              autoFocus
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={handleSave} disabled={!newViewName.trim()}>
              Guardar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => { setAddingView(false); setNewViewName(''); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  const useTabs = views.length <= 4;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {useTabs ? (
        <Tabs value={activeViewId ?? '__none__'} onValueChange={(v) => v !== '__none__' && onApplyView(v)}>
          <TabsList className="h-8">
            {views.map((view) => (
              <TabsTrigger key={view.id} value={view.id} className="text-xs gap-1 h-7 px-3">
                {view.name}
                {!view.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteView(view.id);
                    }}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              {activeViewId ? views.find(v => v.id === activeViewId)?.name ?? 'Vistas' : 'Vistas'}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className="flex items-center justify-between gap-4 text-xs"
                onClick={() => onApplyView(view.id)}
              >
                <span className={view.id === activeViewId ? 'font-medium' : ''}>{view.name}</span>
                {!view.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(view.id);
                    }}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Add view button */}
      {!addingView ? (
        <button
          onClick={() => setAddingView(true)}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="Nombre de la vista"
            className="h-7 text-xs w-36"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setAddingView(false); setNewViewName(''); }
            }}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleSave} disabled={!newViewName.trim()}>
            Guardar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { setAddingView(false); setNewViewName(''); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Restaurar
      </button>
    </div>
  );
}
