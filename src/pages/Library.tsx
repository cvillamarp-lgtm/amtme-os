import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, Download, CheckCircle2, Trash2, Copy, Check, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AssetPreviewModal } from "@/components/library/AssetPreviewModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { useSmartTable } from "@/hooks/useSmartTable";
import {
  ListingToolbar,
  FiltersPanel,
  ViewsTabs,
  BulkActionsBar,
  SmartEmptyState,
} from "@/components/smart-table";
import type { FilterDef, SortOption, SavedView } from "@/components/smart-table";

interface ContentAsset {
  id: string;
  piece_id: number;
  piece_name: string;
  image_url: string | null;
  caption: string | null;
  hashtags: string | null;
  status: string | null;
  created_at: string;
  episode_id: string | null;
}

// ─── Config ────────────────────────────────────────────────────────────────

export const LIBRARY_COLUMNS = [
  { id: 'piece_name', label: 'Pieza', sortable: true, visible: true },
  { id: 'status', label: 'Estado', sortable: true, visible: true },
  { id: 'episode_id', label: 'Episodio', sortable: false, visible: true },
  { id: 'created_at', label: 'Creado', sortable: true, visible: false },
];

const LIBRARY_SORT_OPTIONS: SortOption[] = [
  { value: 'piece_name', label: 'Nombre' },
  { value: 'status', label: 'Estado' },
  { value: 'created_at', label: 'Fecha de creación' },
];

const LIBRARY_FILTER_DEFS: FilterDef[] = [
  {
    field: 'status',
    label: 'Estado',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pendiente' },
      { value: 'generated', label: 'Generado' },
      { value: 'approved', label: 'Aprobado' },
      { value: 'published', label: 'Publicado' },
    ],
  },
  {
    field: 'image_url',
    label: 'Imagen',
    type: 'exists',
  },
];

const LIBRARY_DEFAULT_VIEWS: SavedView[] = [];

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  generated: "Generada",
  approved: "Aprobada",
  published: "Publicada",
};

export default function Library() {
  const qc = useQueryClient();
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["library-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Error cargando biblioteca");
        throw error;
      }
      return (data as any[]) as ContentAsset[];
    },
  });

  const { data: episodes = [] } = useQuery({
    queryKey: ["library-episodes"],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("id, title, number").order("created_at", { ascending: false });
      return (data || []) as { id: string; title: string; number: string | null }[];
    },
  });

  const table = useSmartTable({
    data: assets,
    columns: LIBRARY_COLUMNS,
    searchFields: ['piece_name', 'caption'],
    defaultSort: [{ field: 'created_at', direction: 'desc' }],
    defaultViews: LIBRARY_DEFAULT_VIEWS,
    persistKey: 'amtme:list:library:v1',
    pageSize: 50,
    defaultViewType: 'grid',
  });

  const updateStatus = async (id: string, status: string) => {
    const asset = assets.find((a) => a.id === id);
    const episodeId = asset?.episode_id;
    const { error } = await supabase
      .from("content_assets")
      .update({ status } as any)
      .eq("id", id);
    if (error) {
      toast.error("Error actualizando estado");
    } else {
      qc.invalidateQueries({ queryKey: ["library-assets"] });
      if (episodeId) qc.invalidateQueries({ queryKey: ["episode-assets", episodeId] });
      toast.success("Estado actualizado");
    }
  };

  const deleteAsset = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    const episodeId = asset?.episode_id;
    const { error } = await supabase.from("content_assets").delete().eq("id", id);
    if (error) {
      toast.error("Error eliminando asset");
    } else {
      qc.invalidateQueries({ queryKey: ["library-assets"] });
      if (episodeId) qc.invalidateQueries({ queryKey: ["episode-assets", episodeId] });
      toast.success("Asset eliminado");
    }
  };

  const copyCaption = (asset: ContentAsset) => {
    const text = [asset.caption, asset.hashtags].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId(asset.id);
    toast.success("Caption copiado");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const approveSelected = async () => {
    const ids = Array.from(table.selectedIds);
    const { error } = await supabase
      .from("content_assets")
      .update({ status: 'approved' } as any)
      .in("id", ids);
    if (error) {
      toast.error("Error aprobando assets");
    } else {
      qc.invalidateQueries({ queryKey: ["library-assets"] });
      table.clearSelection();
      toast.success(`${ids.length} assets aprobados`);
    }
  };

  const publishSelected = async () => {
    const ids = Array.from(table.selectedIds);
    const { error } = await supabase
      .from("content_assets")
      .update({ status: 'published' } as any)
      .in("id", ids);
    if (error) {
      toast.error("Error publicando assets");
    } else {
      qc.invalidateQueries({ queryKey: ["library-assets"] });
      table.clearSelection();
      toast.success(`${ids.length} assets publicados`);
    }
  };

  const exportFilteredZip = async () => {
    const withImages = table.filtered.filter((a) => a.image_url);
    if (withImages.length === 0) return toast.error("No hay imágenes para exportar");

    setExporting(true);
    toast.info("Preparando ZIP...");
    const zip = new JSZip();

    for (const asset of withImages) {
      try {
        const res = await fetch(asset.image_url!);
        const blob = await res.blob();
        const ext = asset.image_url!.includes(".png") ? "png" : "jpg";
        zip.file(`${asset.piece_name.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`, blob);
      } catch { /* skip */ }
    }

    const captionsText = table.filtered
      .filter((a) => a.caption || a.hashtags)
      .map((a) => `--- ${a.piece_name} ---\n${a.caption || ""}\n\n${a.hashtags || ""}`)
      .join("\n\n\n");
    if (captionsText) zip.file("captions.txt", captionsText);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AMTME_assets_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success("ZIP descargado");
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Biblioteca de Assets</h1>
          <p className="page-subtitle">Todos tus assets generados en un solo lugar</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{assets.length} assets</Badge>
        </div>
      </div>

      <BulkActionsBar
        selectedCount={table.selectedIds.size}
        totalCount={table.filteredCount}
        onSelectAll={table.selectAll}
        onClearSelection={table.clearSelection}
        isAllSelected={table.isAllSelected}
        isIndeterminate={table.isIndeterminate}
        actions={[
          {
            label: 'Aprobar seleccionados',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            onClick: approveSelected,
          },
          {
            label: 'Publicar seleccionados',
            onClick: publishSelected,
          },
        ]}
      />

      <ListingToolbar
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Buscar pieza..."
        sortOptions={LIBRARY_SORT_OPTIONS}
        currentSort={table.currentSort}
        onSortChange={table.setSortRule}
        filters={table.filters}
        onClearFilters={table.clearFilters}
        onRemoveFilter={table.removeFilter}
        totalCount={table.totalCount}
        filteredCount={table.filteredCount}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(v => !v)}
        showViewToggle={true}
        viewType={table.viewType}
        onViewTypeChange={table.setViewType}
      >
        <Button variant="outline" size="sm" onClick={exportFilteredZip} disabled={exporting || table.filteredCount === 0}>
          <FileArchive className="h-3.5 w-3.5 mr-1.5" />
          Exportar ZIP
        </Button>
      </ListingToolbar>

      <FiltersPanel
        open={filtersOpen}
        filterDefs={LIBRARY_FILTER_DEFS}
        activeFilters={table.filters}
        onAddFilter={table.addFilter}
        onRemoveFilter={table.removeFilter}
        onClearAll={table.clearFilters}
      />

      <ViewsTabs
        views={table.views}
        activeViewId={table.activeViewId}
        onApplyView={table.applyView}
        onSaveView={table.saveView}
        onDeleteView={table.deleteView}
        onReset={table.resetToDefault}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : table.filteredCount === 0 ? (
        <SmartEmptyState
          filtered={table.filters.length > 0 || !!table.searchQuery}
          onClearFilters={table.clearFilters}
          title="No hay assets aún"
          description="Los assets se generan desde el Content Factory"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {table.paginated.map((asset) => (
            <Card
              key={asset.id}
              className={`overflow-hidden group cursor-pointer ${table.selectedIds.has(asset.id) ? 'border-primary/50 bg-primary/5' : ''}`}
              onClick={() => setPreviewAsset(asset)}
            >
              <div className="rounded-t-lg overflow-hidden border-b border-border relative">
                <AspectRatio ratio={1}>
                  {asset.image_url ? (
                    <img src={asset.image_url} alt={asset.piece_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                      <Image className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </AspectRatio>
                {/* Selection checkbox overlay */}
                <div
                  className="absolute top-1.5 left-1.5"
                  onClick={(e) => { e.stopPropagation(); table.toggleSelection(asset.id); }}
                >
                  <input
                    type="checkbox"
                    checked={table.selectedIds.has(asset.id)}
                    onChange={() => table.toggleSelection(asset.id)}
                    className="h-4 w-4 rounded border-2 border-white accent-primary cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{asset.piece_name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {statusLabel[asset.status || "pending"] || asset.status}
                  </Badge>
                </div>
                {asset.caption && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{asset.caption}</p>
                )}
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {asset.status === "generated" && (
                    <Button size="sm" variant="outline" className="h-9 text-xs flex-1" onClick={() => updateStatus(asset.id, "approved")}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobar
                    </Button>
                  )}
                  {asset.status === "approved" && (
                    <Button size="sm" variant="outline" className="h-9 text-xs flex-1" onClick={() => updateStatus(asset.id, "published")}>
                      Publicar
                    </Button>
                  )}
                  {asset.caption && (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => copyCaption(asset)}>
                      {copiedId === asset.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                  {asset.image_url && (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0" asChild>
                      <a href={asset.image_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => deleteAsset(asset.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {table.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-muted-foreground">
            Página {table.currentPage + 1} de {table.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.setCurrentPage(table.currentPage - 1)} disabled={!table.hasPrevPage}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.setCurrentPage(table.currentPage + 1)} disabled={!table.hasNextPage}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <AssetPreviewModal
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
        asset={previewAsset}
      />
    </div>
  );
}
