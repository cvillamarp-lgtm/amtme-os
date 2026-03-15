export interface EpisodeQAData {
  hasTake: boolean;
  hasMaster: boolean;
  hasTranscript: boolean;
  hasQuotes: boolean;
  hasAssets: boolean;
  hasExportPackage: boolean;
  audioPeakDb?: number | null;
  audioRmsDb?: number | null;
  audioClipping?: number | null;
}

export interface QAGate {
  id: string;
  label: string;
  description: string;
  check: (data: EpisodeQAData) => boolean;
  severity: "error" | "warning" | "info";
}

export interface QAResult {
  gate: QAGate;
  passed: boolean;
}

export const QA_GATES: QAGate[] = [
  {
    id: "has_take",
    label: "Toma de audio grabada",
    description: "Debe existir al menos una toma grabada.",
    check: (d) => d.hasTake,
    severity: "error",
  },
  {
    id: "has_master",
    label: "Master de audio generado",
    description: "La toma debe tener un master.",
    check: (d) => d.hasMaster,
    severity: "error",
  },
  {
    id: "no_clipping",
    label: "Sin clipping en master",
    description: "El audio master no debe tener clipping.",
    check: (d) => (d.audioClipping ?? 0) === 0,
    severity: "warning",
  },
  {
    id: "peak_ok",
    label: "Nivel de pico correcto (≤ −1 dBFS)",
    description: "El pico del master debe estar por debajo de −1 dBFS.",
    check: (d) =>
      d.audioPeakDb == null || d.audioPeakDb <= -1,
    severity: "warning",
  },
  {
    id: "rms_ok",
    label: "RMS en rango podcast (−18 a −12 dBFS)",
    description: "El RMS promedio debe estar entre −18 y −12 dBFS.",
    check: (d) =>
      d.audioRmsDb == null ||
      (d.audioRmsDb >= -18 && d.audioRmsDb <= -12),
    severity: "warning",
  },
  {
    id: "has_transcript",
    label: "Transcripción generada",
    description: "El episodio debe tener transcripción.",
    check: (d) => d.hasTranscript,
    severity: "warning",
  },
  {
    id: "has_quotes",
    label: "Quotes aprobados",
    description: "Debe haber al menos un quote candidate.",
    check: (d) => d.hasQuotes,
    severity: "info",
  },
  {
    id: "has_assets",
    label: "Assets visuales generados",
    description: "Debe haber al menos un asset visual aprobado.",
    check: (d) => d.hasAssets,
    severity: "info",
  },
  {
    id: "has_export",
    label: "Paquete de exportación creado",
    description: "Debe existir un paquete de exportación.",
    check: (d) => d.hasExportPackage,
    severity: "info",
  },
];

export function runQAGates(data: EpisodeQAData): QAResult[] {
  return QA_GATES.map((gate) => ({ gate, passed: gate.check(data) }));
}

export function getQASummary(results: QAResult[]): {
  total: number;
  passed: number;
  errors: number;
  warnings: number;
  score: number;
} {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const errors = results.filter((r) => !r.passed && r.gate.severity === "error").length;
  const warnings = results.filter((r) => !r.passed && r.gate.severity === "warning").length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, errors, warnings, score };
}
