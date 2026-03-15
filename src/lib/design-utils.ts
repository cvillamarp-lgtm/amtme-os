// Background rule: determines white vs blue background
export function determineBackground(piece: any): "BLANCO" | "AZUL" {
  const elementos = piece?.elementos?.lista || [];
  const metadata = piece?.metadata || {};

  const tieneCaja = elementos.some((e: string) => e.toLowerCase().includes("caja"));
  const tienePaginacion = elementos.some((e: string) => e.toLowerCase().includes("paginación"));
  const tieneRostro = metadata.tieneRostro || false;
  const esPromo = metadata.esPromo || false;
  const tieneBotonCTA = piece?.ctaBoton !== null && piece?.ctaBoton !== undefined;

  if (tieneCaja || tienePaginacion) return "BLANCO";
  if (tieneRostro || tieneBotonCTA || esPromo) return "AZUL";
  return "BLANCO";
}

// WCAG contrast ratio calculator
export function calculateContrast(fg: string, bg: string): number {
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 10) / 10;
}

export function meetsWCAG(ratio: number, level: "AA" | "AAA" = "AA"): boolean {
  return level === "AA" ? ratio >= 4.5 : ratio >= 7;
}

// Naming convention generator
export function generateFilename(piece: any, version = "v01"): string {
  const tipo = piece.metadata?.tipo?.split(" ")[0]?.toUpperCase() || "PIEZA";
  const fecha = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const desc =
    piece.contenido?.h1?.texto
      ?.split("\n")[0]
      ?.replace(/[^a-zA-Z0-9áéíóúñ]/g, "")
      ?.substring(0, 20) || "Pieza";
  return `AMTME_${tipo}_${desc}_${fecha}_${version}.png`;
}
