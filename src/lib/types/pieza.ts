// TypeScript types for AMTME Design System pieces (from CodePack forensic analysis)

export interface SafeZone {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  label: string;
}

export interface NoGoZone {
  area: string;
  condition: string;
}

export interface Margenes {
  horizontal: string;
  top: string;
  bottom: string;
}

export interface Coordenada {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  label: string;
}

export interface H1Content {
  texto: string;
  lineas: string[];
  keywords?: string[];
  enfasis: string;
  alineacion: "izquierda" | "centro" | "derecha";
  anchoMax: number;
  interlinea: number;
  ubicacion: string;
}

export interface CtaBoton {
  tipo: string;
  texto: string;
  radius: number;
  tamano: { width: number; height: number };
  ubicacion: Coordenada;
  distancias: { aBordes: number; aLockup: number };
  tipografia: { fuente: string; tamano: number; color: string };
  fondo: string;
  borde: { color: string; grosor: number };
  alineacion: string;
  padding: { vertical: number; horizontal: number };
  hover: { fondo: string; texto: string };
}

export interface QA {
  reticula: boolean;
  jerarquia: boolean;
  composicion: boolean;
  safeZones: boolean;
  noGoZones: boolean;
  logos: boolean;
  cta: boolean | null;
  contraste: boolean;
  ortografia: boolean;
  export: boolean;
  score: number;
  total: number;
}

export interface PiezaExport {
  formato: "PNG" | "JPG" | "PDF";
  compresion: number;
  perfilColor: "sRGB" | "Adobe RGB" | "Display P3";
  nombreArchivo: string;
  carpeta: string;
  rutaCompleta: string;
}

export interface Pieza {
  id: string;
  metadata: {
    tipo: string;
    plataforma: string;
    objetivo: string;
    fecha: string;
    prioridad: "Alta" | "Media" | "Baja";
    responsable: string;
    estado: string;
    version: string;
    imagePath: string;
    tieneRostro: boolean;
    esPromo: boolean;
  };
  dimensiones: {
    ratio: number;
    width: number;
    height: number;
    pixels: string;
    safeZone: SafeZone;
    noGoZones: NoGoZone[];
    grid: string;
    margenes: Margenes;
    gutters: string;
  };
  fondo: {
    tipo: string;
    decision: "BLANCO" | "AZUL";
    hex: string | string[];
    regla: string;
    justificacion: string;
  };
  estructura: {
    bloques: string[];
    composicion: string;
    jerarquia: string[];
    flujoLectura: string;
    balance: string;
    espacioNegativo: string;
    coordenadas: Record<string, Coordenada>;
  };
  contenido: {
    h1: H1Content | null;
    h2: string | null;
    cuerpo: string | null;
    cta: string | null;
    disclaimer: string | null;
    hashtags: string[] | null;
    altText: string;
  };
  tipografia: {
    h1: {
      fuente: string;
      ejemplos?: string[];
      peso: string;
      tamano?: number;
      unidad?: string;
      tamanosVariables?: Record<string, { tamano: number; color: string }>;
      tracking: number;
      color: string;
    };
    h2: unknown | null;
    cuerpo: unknown | null;
    cta?: {
      fuente: string;
      peso: string;
      tamano: number;
      color: string;
    };
    jerarquia: string;
    legibilidadMovil: string;
  };
  paleta: {
    coloresUsados: string[];
    fondo: string | string[];
    h1: string | Record<string, string>;
    h2: string | null;
    cta: string | null;
    contraste: Record<string, unknown>;
    acentos: string;
  };
  elementos: {
    lista: string[];
    estilo: string;
    patronDominante: string;
    iconografia: unknown | null;
    ilustracion: unknown | null;
    reglasNoEdicion: string[];
  };
  logos: {
    identidadPodcast: boolean;
    principal: {
      aplica: boolean;
      nombre?: string;
      ubicacion?: Coordenada;
      tamano?: { width: number; height: number };
      proteccion?: number;
      color?: string;
    };
    plataformas: {
      aplica: boolean;
      logos?: string[];
      ubicacion?: Coordenada;
      tamano?: { height: number };
      separacion?: number;
      separacionBordes?: { horizontal: number; top: number };
    };
  };
  ctaBoton: CtaBoton | null;
  qa: QA;
  export: PiezaExport;
}

export interface TipoPieza {
  id: string;
  nombre: string;
  descripcion: string;
  dimensiones: { width: number; height: number; ratio: number };
  safeZone: string;
  modulosObligatorios: string[];
  fondoRegla: {
    decision: string;
    justificacion: string;
    senales: string[];
  };
  casosUso: string[];
  ejemplos: string[];
}

export interface ColorPaleta {
  id: string;
  nombre: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  uso: string;
  categoria: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  descripcion: string;
  categoria: string;
  obligatorio: boolean;
}

export interface PiezaData {
  metadata: {
    version: string;
    fechaAnalisis: string;
    totalPiezas: number;
    responsable: string;
  };
  piezas: Pieza[];
  tipos: TipoPieza[];
  paleta: {
    nombre: string;
    colores: ColorPaleta[];
  };
  checklistQA: ChecklistItem[];
}
