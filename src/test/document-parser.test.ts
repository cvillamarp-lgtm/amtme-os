import { describe, it, expect } from "vitest";
import { parseDocument, computeStats, parseRenumberedEpisodes } from "@/lib/document-parser";

const SAMPLE_DOC = `# SECCIÓN 1 — IDENTIDAD DE MARCA

## DATOS DE IDENTIDAD

Nombre: A Mi Tampoco Me Explicaron
Host: Christian Villamar
Plataforma principal: Spotify

## VALORES DE MARCA

- Autenticidad
- Vulnerabilidad controlada
- Acompañamiento sin juicio

# SECCIÓN 2 — CATÁLOGO DE EPISODIOS

## LOS 28 EPISODIOS RENUMERADOS

Ep. 1 El que no sabe decir que no
Ep. 2 El casino emocional
Ep. 3 Apego ansioso
`;

describe("parseDocument", () => {
  it("splits document into blocks", () => {
    const blocks = parseDocument(SAMPLE_DOC);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("assigns destinations based on section keywords", () => {
    const blocks = parseDocument(SAMPLE_DOC);
    const brandBlocks = blocks.filter(b => b.destinationModule === "sistema_brand");
    expect(brandBlocks.length).toBeGreaterThan(0);
  });

  it("generates unique hashes for blocks", () => {
    const blocks = parseDocument(SAMPLE_DOC);
    const hashes = blocks.map(b => b.sourceHash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(hashes.length);
  });
});

describe("computeStats", () => {
  it("returns correct totals", () => {
    const blocks = parseDocument(SAMPLE_DOC);
    const stats = computeStats(blocks);
    expect(stats.total).toBe(blocks.length);
    expect(Object.values(stats.byDestination).reduce((a, b) => a + b, 0)).toBe(stats.total);
  });
});

describe("parseRenumberedEpisodes", () => {
  it("parses episodes from Ep. N format", () => {
    const episodes = parseRenumberedEpisodes(SAMPLE_DOC);
    expect(episodes.length).toBe(3);
    expect(episodes[0].number).toBe("1");
    expect(episodes[0].title).toContain("no sabe decir");
    expect(episodes[2].number).toBe("3");
  });

  it("returns empty array for text without episodes", () => {
    const episodes = parseRenumberedEpisodes("No episodes here");
    expect(episodes).toHaveLength(0);
  });
});
