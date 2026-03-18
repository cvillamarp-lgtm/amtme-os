import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Search, Trash2, Pin, PinOff, ChevronLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  usePinNote,
  type NotePreview,
} from "@/hooks/useNotes";
import { useAutosave } from "@/hooks/useAutosave";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return "ahora";
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function snippet(body: string) {
  const first = body.split("\n").find((l) => l.trim()) ?? "";
  return first.length > 72 ? first.slice(0, 72) + "…" : first || "Sin contenido";
}

// ─── Save status indicator ────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <span
      className={[
        "text-[11px] tracking-tight transition-opacity duration-300",
        status === "saving" ? "text-muted-foreground" : "",
        status === "saved"  ? "text-emerald-500"      : "",
        status === "error"  ? "text-destructive"       : "",
      ].join(" ")}
    >
      {status === "saving" && "Guardando…"}
      {status === "saved"  && "Guardado"}
      {status === "error"  && (
        <button className="underline" onClick={() => window.dispatchEvent(new CustomEvent("notes:retry-save"))}>
          Error — Reintentar
        </button>
      )}
    </span>
  );
}

// ─── Note list item ───────────────────────────────────────────────────────────

function NoteItem({
  note,
  active,
  onClick,
}: {
  note: NotePreview;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2.5 rounded-[8px] transition-colors duration-100",
        "border border-transparent",
        active
          ? "bg-primary/10 border-primary/15"
          : "hover:bg-sidebar-accent",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {note.pinned && <Pin className="h-3 w-3 shrink-0 text-primary/60" />}
        <p className={[
          "text-sm font-medium tracking-tight truncate flex-1",
          active ? "text-primary" : "text-foreground",
        ].join(" ")}>
          {note.title || "Sin título"}
        </p>
        <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">
          {timeAgo(note.updated_at)}
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground/70 truncate mt-0.5 pl-0.5">
        {snippet(note.body)}
      </p>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Notes() {
  const [search,      setSearch]      = useState("");
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [title,       setTitle]       = useState("");
  const [body,        setBody]        = useState("");
  const [showEditor,  setShowEditor]  = useState(false); // mobile only

  const titleRef    = useRef<HTMLInputElement>(null);
  const bodyRef     = useRef<HTMLTextAreaElement>(null);

  const { data: notes = [], isLoading } = useNotes(search);
  const createNote  = useCreateNote();
  const updateNote  = useUpdateNote();
  const deleteNote  = useDeleteNote();
  const pinNote     = usePinNote();

  // ── Autosave ──────────────────────────────────────────────────────────────

  const getData = useCallback(
    () => ({ id: selectedId ?? "", title, body }),
    [selectedId, title, body],
  );

  const onSave = useCallback(
    async ({ id, title: t, body: b }: { id: string; title: string; body: string }) => {
      if (!id) return;
      await updateNote.mutateAsync({ id, title: t, body: b });
    },
    [updateNote],
  );

  const { status: saveStatus, schedule, flush, resetHash } = useAutosave(getData, onSave);

  // Retry-save event (from error indicator button)
  useEffect(() => {
    const handler = () => flush();
    window.addEventListener("notes:retry-save", handler);
    return () => window.removeEventListener("notes:retry-save", handler);
  }, [flush]);

  // Keyboard shortcut Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        flush();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flush]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  // ── Note selection ────────────────────────────────────────────────────────

  const selectNote = useCallback(
    (note: NotePreview) => {
      // Flush any pending save for the previous note
      flush();

      setSelectedId(note.id);
      setTitle(note.title);
      setBody(note.body);
      setShowEditor(true);

      // Mark freshly-loaded content as "saved" — not dirty
      resetHash(JSON.stringify({ id: note.id, title: note.title, body: note.body }));

      // Focus the appropriate field
      requestAnimationFrame(() => {
        if (!note.title) titleRef.current?.focus();
        else bodyRef.current?.focus();
      });
    },
    [flush, resetHash],
  );

  // ── Auto-select first note on load ────────────────────────────────────────

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      selectNote(notes[0]);
    }
  }, [notes, selectedId, selectNote]);

  // ── Sync local state when selected note updates in the list ──────────────
  // (e.g. after a save refreshes the list, the title/body are already local so no-op)

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      const newNote = await createNote.mutateAsync();
      selectNote({ ...newNote, pinned: false });
    } catch {
      toast.error("No se pudo crear la nota");
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const prevId = selectedId;

    // Select next note before deleting
    const remaining = notes.filter((n) => n.id !== prevId);
    setSelectedId(null);
    setTitle("");
    setBody("");
    setShowEditor(false);

    try {
      await deleteNote.mutateAsync(prevId);
      if (remaining.length > 0) selectNote(remaining[0]);
    } catch {
      toast.error("No se pudo eliminar la nota");
    }
  };

  const handlePin = async () => {
    if (!selectedId) return;
    const note = notes.find((n) => n.id === selectedId);
    if (!note) return;
    try {
      await pinNote.mutateAsync({ id: selectedId, pinned: !note.pinned });
    } catch {
      toast.error("No se pudo fijar la nota");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedNote = notes.find((n) => n.id === selectedId);
  const isPinned = selectedNote?.pinned ?? false;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Note list ──────────────────────────────────────────── */}
      <aside
        className={[
          "w-[300px] shrink-0 border-r border-border/50 flex flex-col bg-sidebar",
          // Mobile: hide when editor is open
          showEditor ? "hidden md:flex" : "flex",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <span className="text-[13px] font-semibold text-foreground tracking-tight">Notas</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCreate}
            disabled={createNote.isPending}
            className="h-7 w-7 rounded-[6px]"
            title="Nueva nota"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notas…"
              className="h-8 pl-8 text-sm bg-muted/50 border-transparent focus:bg-card"
            />
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-px">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground/60">
                {search ? "Sin resultados" : "Sin notas. Crea la primera."}
              </p>
              {!search && (
                <Button size="sm" variant="outline" onClick={handleCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nueva nota
                </Button>
              )}
            </div>
          )}

          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              active={note.id === selectedId}
              onClick={() => selectNote(note)}
            />
          ))}
        </div>
      </aside>

      {/* ── Right: Editor ────────────────────────────────────────────── */}
      <div
        className={[
          "flex-1 flex flex-col min-w-0 bg-background",
          // Mobile: show only when editor is open
          showEditor ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {selectedId ? (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/40 min-h-[44px]">
              {/* Mobile back button */}
              <button
                onClick={() => setShowEditor(false)}
                className="md:hidden flex items-center gap-1 text-sm text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
                Notas
              </button>

              <div className="hidden md:block" />

              <div className="flex items-center gap-3">
                <SaveIndicator status={saveStatus} />

                <button
                  onClick={handlePin}
                  className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  title={isPinned ? "Desfijar" : "Fijar nota"}
                >
                  {isPinned
                    ? <PinOff className="h-3.5 w-3.5" />
                    : <Pin    className="h-3.5 w-3.5" />
                  }
                </button>

                <button
                  onClick={handleDelete}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  title="Archivar nota"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Title */}
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                schedule();
              }}
              placeholder="Título"
              className={[
                "w-full px-6 pt-6 pb-2",
                "text-2xl font-semibold tracking-tight bg-transparent",
                "border-none outline-none resize-none",
                "placeholder:text-muted-foreground/30",
              ].join(" ")}
            />

            {/* Body */}
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                schedule();
              }}
              placeholder="Empieza a escribir…"
              className={[
                "flex-1 w-full px-6 py-2 pb-16",
                "text-[15px] leading-relaxed bg-transparent",
                "border-none outline-none resize-none",
                "placeholder:text-muted-foreground/30",
                "font-body",
              ].join(" ")}
              style={{ minHeight: "calc(100vh - 220px)" }}
            />
          </>
        ) : (
          /* Empty state — no note selected */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-medium text-muted-foreground/60">Selecciona una nota</p>
              <p className="text-xs text-muted-foreground/40 mt-1">o crea una nueva</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nueva nota
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
