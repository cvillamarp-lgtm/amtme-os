import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Square,
  Upload,
  AudioLines,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  WandSparkles,
  Download,
  LoaderCircle,
  ServerCog,
  FileAudio,
  Languages,
  ScanText,
  FileText,
  Scissors,
  Quote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { analyzeAudioBlob, getAudioQualityLabel } from "@/lib/audio-analysis";
import { masterVoiceBlobInBrowser, PODCAST_VOICE_PROFILE } from "@/lib/audio-mastering";
import { buildSrt, downloadSrt } from "@/lib/audio-srt";
import { MasterPresetSelector, type AudioMasterPreset } from "@/components/audio/MasterPresetSelector";
import { useAudioProcessingJobs, useQueueAudioMasterJob } from "@/hooks/useAudioProcessingJobs";
import { useAudioTranscript, useQueueAudioTranscript } from "@/hooks/useAudioTranscript";
import {
  useAudioSegmentSelections,
  useUpsertAudioSegmentSelection,
} from "@/hooks/useAudioSegmentSelections";
import { useCreateQuoteCandidate, useQuoteCandidates } from "@/hooks/useQuoteCandidates";
import { useQueueAudioClipExport } from "@/hooks/useAudioClipExport";
import { TranscriptViewer } from "@/components/audio/TranscriptViewer";
import { ReusableSegmentsPanel } from "@/components/audio/ReusableSegmentsPanel";
import { TextBasedEditor } from "@/components/audio/TextBasedEditor";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return "—";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function NotesList({
  tone,
  notes,
}: {
  tone?: "good" | "warning" | "bad";
  notes?: string[];
}) {
  const items = notes?.length ? notes : ["La toma tiene una base correcta para seguir al siguiente paso."];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Observaciones</p>
      <div className="space-y-2">
        {items.map((note) => (
          <div key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
            {tone === "bad" ? (
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
            )}
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AudioStudio() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [episodeId, setEpisodeId] = useState<string>("none");
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof analyzeAudioBlob>> | null>(null);
  const [masterBlob, setMasterBlob] = useState<Blob | null>(null);
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [masterAnalysis, setMasterAnalysis] = useState<Awaited<ReturnType<typeof analyzeAudioBlob>> | null>(null);
  const [masteringStatus, setMasteringStatus] = useState<"none" | "ready" | "failed">("none");
  const [masteringError, setMasteringError] = useState<string | null>(null);
  const [serverPreset, setServerPreset] = useState<AudioMasterPreset>("voice_solo");
  const [savedTakeId, setSavedTakeId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const {
    isRecording,
    audioBlob,
    audioUrl,
    durationMs,
    inputLevel,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const { data: episodes = [] } = useQuery({
    queryKey: ["audio-episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: takes = [], isLoading: loadingTakes } = useQuery({
    queryKey: ["audio-takes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_takes" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const quality = useMemo(() => {
    if (!analysis) return null;
    return getAudioQualityLabel(analysis);
  }, [analysis]);

  const masterQuality = useMemo(() => {
    if (!masterAnalysis) return null;
    return getAudioQualityLabel(masterAnalysis);
  }, [masterAnalysis]);

  const { data: jobs = [] } = useAudioProcessingJobs(savedTakeId || undefined);
  const queueServerMasterMutation = useQueueAudioMasterJob();
  const { data: transcriptData, isLoading: transcriptLoading } = useAudioTranscript(savedTakeId || undefined);
  const queueTranscriptMutation = useQueueAudioTranscript();
  const { data: selections = [] } = useAudioSegmentSelections(savedTakeId || undefined);
  const upsertSelectionMutation = useUpsertAudioSegmentSelection(savedTakeId || undefined);
  const createQuoteMutation = useCreateQuoteCandidate(savedTakeId || undefined);
  const { data: quoteCandidates = [] } = useQuoteCandidates(savedTakeId || undefined);
  const queueClipExportMutation = useQueueAudioClipExport();

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error("No hay audio para analizar.");
      return analyzeAudioBlob(audioBlob);
    },
    onSuccess: (result) => {
      setAnalysis(result);
      toast.success("Análisis completado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const masterMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error("Primero graba una toma.");

      setMasteringStatus("none");
      setMasteringError(null);

      const mastered = await masterVoiceBlobInBrowser(audioBlob, PODCAST_VOICE_PROFILE);
      const masteredAnalysis = await analyzeAudioBlob(mastered.blob);

      return { masteredBlob: mastered.blob, masteredAnalysis };
    },
    onSuccess: ({ masteredBlob, masteredAnalysis }) => {
      if (masterUrl) URL.revokeObjectURL(masterUrl);

      const nextUrl = URL.createObjectURL(masteredBlob);
      setMasterBlob(masteredBlob);
      setMasterUrl(nextUrl);
      setMasterAnalysis(masteredAnalysis);
      setMasteringStatus("ready");
      setMasteringError(null);

      toast.success("Master ligero generado");
    },
    onError: (err: Error) => {
      setMasteringStatus("failed");
      setMasteringError(err.message);
      toast.error(err.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error("Primero graba una toma.");
      if (!title.trim()) throw new Error("Escribe un nombre para la toma.");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const safeTitle = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const originalExt = audioBlob.type.includes("webm") ? "webm" : "wav";
      const originalPath = `${user.id}/${Date.now()}-${safeTitle}-original.${originalExt}`;

      const { error: uploadOriginalError } = await supabase.storage
        .from("audio-takes")
        .upload(originalPath, audioBlob, {
          cacheControl: "3600",
          contentType: audioBlob.type || "audio/webm",
          upsert: false,
        });

      if (uploadOriginalError) throw uploadOriginalError;

      const { data: { publicUrl: originalUrl } } = supabase.storage.from("audio-takes").getPublicUrl(originalPath);

      let masterPath: string | null = null;
      let masterPublicUrl: string | null = null;

      if (masterBlob) {
        masterPath = `${user.id}/${Date.now()}-${safeTitle}-master.wav`;

        const { error: uploadMasterError } = await supabase.storage
          .from("audio-masters")
          .upload(masterPath, masterBlob, {
            cacheControl: "3600",
            contentType: "audio/wav",
            upsert: false,
          });

        if (uploadMasterError) throw uploadMasterError;

        const { data: { publicUrl } } = supabase.storage.from("audio-masters").getPublicUrl(masterPath);
        masterPublicUrl = publicUrl;
      }

      const payload = {
        user_id: user.id,
        episode_id: episodeId === "none" ? null : episodeId,
        title: title.trim(),
        original_file_path: originalPath,
        original_file_url: originalUrl,
        original_mime_type: audioBlob.type || "audio/webm",
        duration_seconds: analysis?.durationSeconds ?? null,
        peak_db: analysis?.peakDb ?? null,
        rms_db: analysis?.rmsDb ?? null,
        clipping_count: analysis?.clippingCount ?? 0,
        sample_rate: analysis?.sampleRate ?? null,
        channels: analysis?.channels ?? null,
        master_file_path: masterPath,
        master_file_url: masterPublicUrl,
        master_mime_type: masterBlob ? "audio/wav" : null,
        master_duration_seconds: masterAnalysis?.durationSeconds ?? null,
        master_peak_db: masterAnalysis?.peakDb ?? null,
        master_rms_db: masterAnalysis?.rmsDb ?? null,
        master_clipping_count: masterAnalysis?.clippingCount ?? null,
        mastering_status: masterBlob ? masteringStatus : "none",
        mastering_profile: masterBlob ? PODCAST_VOICE_PROFILE.name : null,
        mastering_last_error: masteringError,
        status: "recorded",
        processing_notes: quality?.notes?.join(" ") || null,
      };

      const { data: insertedTake, error: insertError } = await supabase
        .from("audio_takes" as any)
        .insert(payload)
        .select("*")
        .single();

      if (insertError) throw insertError;
      return insertedTake;
    },
    onSuccess: (insertedTake) => {
      toast.success("Toma guardada con éxito");
      queryClient.invalidateQueries({ queryKey: ["audio-takes"] });
      setSavedTakeId(insertedTake.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleMarkRemove = (segment: any) => {
    if (!currentUserId || !savedTakeId) return;
    upsertSelectionMutation.mutate({ transcriptSegmentId: segment.id, actionType: "remove", userId: currentUserId });
  };

  const handleMarkClip = (segment: any) => {
    if (!currentUserId || !savedTakeId) return;
    upsertSelectionMutation.mutate({ transcriptSegmentId: segment.id, actionType: "clip", userId: currentUserId });
    queueClipExportMutation.mutate(
      { audioTakeId: savedTakeId, startSeconds: Number(segment.start_seconds), endSeconds: Number(segment.end_seconds), label: `clip-${segment.id}` },
      {
        onSuccess: () => toast.success("Clip enviado a exportación"),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const handleMarkQuote = (segment: any) => {
    if (!currentUserId || !savedTakeId) return;
    upsertSelectionMutation.mutate({ transcriptSegmentId: segment.id, actionType: "quote", userId: currentUserId });
    createQuoteMutation.mutate(
      {
        user_id: currentUserId,
        episode_id: episodeId === "none" ? null : episodeId,
        audio_take_id: savedTakeId,
        transcript_segment_id: segment.id,
        text: segment.text,
        source_type: "audio_transcript",
        quote_type: "candidate",
        start_seconds: segment.start_seconds,
        end_seconds: segment.end_seconds,
        emotional_score: segment.emotional_score,
        clarity_score: segment.clarity_score,
        reuse_score: segment.reuse_score,
        status: "candidate",
      },
      {
        onSuccess: () => toast.success("Quote candidate creado"),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        title="Audio Studio"
        subtitle="Grabación, auditoría técnica y master ligero para voz hablada."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Recording Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Grabación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="audio-title">Nombre de la toma</Label>
                  <Input
                    id="audio-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Ep. 32 intro toma 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Episodio vinculado</Label>
                  <Select value={episodeId} onValueChange={setEpisodeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un episodio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin episodio</SelectItem>
                      {episodes.map((episode: any) => (
                        <SelectItem key={episode.id} value={episode.id}>
                          {episode.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <MasterPresetSelector value={serverPreset} onChange={setServerPreset} />

              <div className="rounded-xl border border-border p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="text-lg font-medium text-foreground">
                      {isRecording ? "Grabando" : audioBlob ? "Toma lista" : "Listo para grabar"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Duración</p>
                    <p className="text-lg font-medium text-foreground">{formatDuration(durationMs)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nivel de entrada</span>
                    <span className="text-foreground">{Math.round(inputLevel * 100)}%</span>
                  </div>
                  <Progress value={Math.min(100, Math.round(inputLevel * 100))} />
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isRecording ? (
                    <Button onClick={startRecording} className="min-w-[180px]">
                      <Mic className="h-4 w-4 mr-2" />
                      Iniciar grabación
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stopRecording} className="min-w-[180px]">
                      <Square className="h-4 w-4 mr-2" />
                      Detener grabación
                    </Button>
                  )}

                  <Button variant="secondary" onClick={() => analyzeMutation.mutate()} disabled={!audioBlob || analyzeMutation.isPending}>
                    <AudioLines className="h-4 w-4 mr-2" />
                    Analizar voz
                  </Button>

                  <Button variant="secondary" onClick={() => masterMutation.mutate()} disabled={!audioBlob || masterMutation.isPending}>
                    <WandSparkles className="h-4 w-4 mr-2" />
                    Masterizar voz
                  </Button>

                  <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={!audioBlob || saveMutation.isPending}>
                    <Upload className="h-4 w-4 mr-2" />
                    Guardar toma
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!savedTakeId) { toast.error("Primero guarda la toma."); return; }
                      queueServerMasterMutation.mutate(
                        { audioTakeId: savedTakeId, preset: serverPreset },
                        {
                          onSuccess: () => { toast.success("Job enviado al servidor"); queryClient.invalidateQueries({ queryKey: ["audio-processing-jobs", savedTakeId] }); },
                          onError: (err: Error) => toast.error(err.message),
                        }
                      );
                    }}
                    disabled={!savedTakeId || queueServerMasterMutation.isPending}
                  >
                    {queueServerMasterMutation.isPending ? <LoaderCircle className="h-4 w-4 mr-2 animate-spin" /> : <ServerCog className="h-4 w-4 mr-2" />}
                    Procesar en servidor
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!savedTakeId) { toast.error("Primero guarda la toma."); return; }
                      queueTranscriptMutation.mutate(
                        { audioTakeId: savedTakeId, language: "es" },
                        {
                          onSuccess: () => { toast.success("Transcripción enviada"); queryClient.invalidateQueries({ queryKey: ["audio-transcript", savedTakeId] }); },
                          onError: (err: Error) => toast.error(err.message),
                        }
                      );
                    }}
                    disabled={!savedTakeId || queueTranscriptMutation.isPending}
                  >
                    <Languages className="h-4 w-4 mr-2" />
                    Transcribir audio
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAnalysis(null);
                      setMasterBlob(null);
                      if (masterUrl) URL.revokeObjectURL(masterUrl);
                      setMasterUrl(null);
                      setMasterAnalysis(null);
                      setMasteringStatus("none");
                      setMasteringError(null);
                      setSavedTakeId(null);
                      resetRecording();
                    }}
                    disabled={isRecording}
                  >
                    Reiniciar
                  </Button>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {audioUrl && (
                  <div className="space-y-2">
                    <Label>Original</Label>
                    <audio controls className="w-full" src={audioUrl} />
                  </div>
                )}

                {masterUrl && (
                  <div className="space-y-2">
                    <Label>Master</Label>
                    <audio controls className="w-full" src={masterUrl} />
                    <a href={masterUrl} download={`${title || "audio-master"}.wav`} className="inline-flex items-center text-sm text-primary hover:underline">
                      <Download className="h-4 w-4 mr-1" />
                      Descargar WAV master
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Card */}
          <Card>
            <CardHeader><CardTitle>Análisis original</CardTitle></CardHeader>
            <CardContent>
              {!analysis ? (
                <div className="text-sm text-muted-foreground">Graba una toma y ejecuta el análisis para medir duración, pico, RMS, clipping y base técnica.</div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Badge variant={quality?.tone === "good" ? "default" : quality?.tone === "warning" ? "secondary" : "destructive"}>{quality?.label}</Badge>
                    <span className="text-sm text-muted-foreground">Auditoría rápida de captura.</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard label="Duración" value={formatSeconds(analysis.durationSeconds)} />
                    <MetricCard label="Pico máximo" value={`${analysis.peakDb} dB`} />
                    <MetricCard label="RMS promedio" value={`${analysis.rmsDb} dB`} />
                    <MetricCard label="Clipping" value={`${analysis.clippingCount}`} />
                    <MetricCard label="Sample rate" value={`${analysis.sampleRate} Hz`} />
                    <MetricCard label="Canales" value={`${analysis.channels}`} />
                  </div>
                  <NotesList tone={quality?.tone} notes={quality?.notes} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Master Card */}
          <Card>
            <CardHeader><CardTitle>Master ligero</CardTitle></CardHeader>
            <CardContent>
              {!masterAnalysis ? (
                <div className="text-sm text-muted-foreground">Ejecuta "Masterizar voz" para generar una versión más estable para podcast hablado.</div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Badge variant={masterQuality?.tone === "good" ? "default" : masterQuality?.tone === "warning" ? "secondary" : "destructive"}>
                      {masteringStatus === "ready" ? "Master listo" : masteringStatus}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Perfil aplicado: {PODCAST_VOICE_PROFILE.name}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard label="Duración" value={formatSeconds(masterAnalysis.durationSeconds)} />
                    <MetricCard label="Pico máximo" value={`${masterAnalysis.peakDb} dB`} />
                    <MetricCard label="RMS promedio" value={`${masterAnalysis.rmsDb} dB`} />
                    <MetricCard label="Clipping" value={`${masterAnalysis.clippingCount}`} />
                    <MetricCard label="Sample rate" value={`${masterAnalysis.sampleRate} Hz`} />
                    <MetricCard label="Canales" value={`${masterAnalysis.channels}`} />
                  </div>
                  <NotesList tone={masterQuality?.tone} notes={masterQuality?.notes} />
                </div>
              )}
              {masteringError && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{masteringError}</div>
              )}
            </CardContent>
          </Card>

          {/* Server Jobs Card */}
          <Card>
            <CardHeader><CardTitle>Procesamiento en servidor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!savedTakeId ? (
                <div className="text-sm text-muted-foreground">Guarda primero la toma para poder procesarla en servidor.</div>
              ) : jobs.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aún no hay jobs para esta toma.</div>
              ) : (
                jobs.map((job: any) => (
                  <div key={job.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{job.job_type}</p>
                        <p className="text-xs text-muted-foreground">Preset: {job.preset}</p>
                      </div>
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                    {job.error_message && <div className="text-sm text-destructive">{job.error_message}</div>}
                    {job.output_file_url && (
                      <a href={job.output_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Abrir master del servidor
                      </a>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Transcript Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                Transcripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!savedTakeId ? (
                <div className="text-sm text-muted-foreground">Guarda primero la toma para transcribirla.</div>
              ) : transcriptLoading ? (
                <div className="text-sm text-muted-foreground">Cargando transcripción…</div>
              ) : !transcriptData?.transcript ? (
                <div className="text-sm text-muted-foreground">No existe transcripción aún para esta toma.</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{transcriptData.transcript.status}</Badge>
                    <span className="text-sm text-muted-foreground">Idioma: {transcriptData.transcript.language}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const segments = transcriptData?.segments || [];
                        if (!segments.length) { toast.error("No hay segmentos para exportar"); return; }
                        const srt = buildSrt(segments.map((s: any) => ({ start_seconds: Number(s.start_seconds), end_seconds: Number(s.end_seconds), text: s.text })));
                        downloadSrt(`${title || "podcast"}-subtitulos.srt`, srt);
                        toast.success("SRT exportado");
                      }}
                    >
                      <Scissors className="h-4 w-4 mr-1" />
                      Exportar SRT
                    </Button>
                  </div>
                  {transcriptData.transcript.full_text && (
                    <div className="rounded-lg border border-border p-4 bg-muted/20">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{transcriptData.transcript.full_text}</p>
                    </div>
                  )}
                  {transcriptData.transcript.error_message && (
                    <div className="text-sm text-destructive">{transcriptData.transcript.error_message}</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Segments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanText className="h-5 w-5" />
                Segmentos detectados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptViewer
                segments={transcriptData?.segments || []}
                onSeek={(seconds) => {
                  const audio = document.querySelector("audio");
                  if (audio) { audio.currentTime = seconds; void audio.play(); }
                }}
              />
            </CardContent>
          </Card>

          {/* Text Editor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Editor por texto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TextBasedEditor
                segments={transcriptData?.segments || []}
                selections={selections || []}
                onSeek={(seconds) => {
                  const audio = document.querySelector("audio");
                  if (audio) { audio.currentTime = seconds; void audio.play(); }
                }}
                onMarkRemove={handleMarkRemove}
                onMarkClip={handleMarkClip}
                onMarkQuote={handleMarkQuote}
              />
            </CardContent>
          </Card>

          {/* Quote Candidates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Quote className="h-5 w-5" />
                Quote candidates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!quoteCandidates.length ? (
                <div className="text-sm text-muted-foreground">Aún no hay quote candidates creados desde esta toma.</div>
              ) : (
                quoteCandidates.map((quote: any) => (
                  <div key={quote.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="secondary">{quote.status}</Badge>
                      <span className="text-xs text-muted-foreground">{quote.start_seconds ?? "—"}s → {quote.end_seconds ?? "—"}s</span>
                    </div>
                    <p className="text-sm text-foreground">{quote.text}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Emoción: {quote.emotional_score ?? "—"}</span>
                      <span>Claridad: {quote.clarity_score ?? "—"}</span>
                      <span>Reuse: {quote.reuse_score ?? "—"}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Qué hace esta versión</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Graba voz dentro de la app.</p>
              <p>• Audita pico, RMS, clipping y sample rate.</p>
              <p>• Aplica un master ligero pensado para voz hablada.</p>
              <p>• Guarda original y master en Supabase.</p>
              <p>• Transcribe y detecta hooks, quotes y clips.</p>
              <p>• Editor por texto con marcado de segmentos.</p>
              <p>• Exporta subtítulos .srt.</p>
              <p>• Crea quote candidates automáticamente.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tomas recientes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loadingTakes ? (
                <div className="text-sm text-muted-foreground">Cargando tomas…</div>
              ) : takes.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aún no hay tomas guardadas en Audio Studio.</div>
              ) : (
                takes.map((take: any) => (
                  <div key={take.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{take.title}</p>
                        <p className="text-xs text-muted-foreground">{formatSeconds(take.duration_seconds)} · {take.original_mime_type}</p>
                      </div>
                      <Badge variant="secondary">{take.mastering_status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Orig pico: {take.peak_db ?? "—"} dB</span>
                      <span>Orig RMS: {take.rms_db ?? "—"} dB</span>
                      <span>Master pico: {take.master_peak_db ?? "—"} dB</span>
                      <span>Master RMS: {take.master_rms_db ?? "—"} dB</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {take.original_file_url && (
                        <a href={take.original_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
                          <PlayCircle className="h-4 w-4 mr-1" />Original
                        </a>
                      )}
                      {take.master_file_url && (
                        <a href={take.master_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
                          <PlayCircle className="h-4 w-4 mr-1" />Master
                        </a>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSavedTakeId(take.id)}>
                      Seleccionar toma
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
