export function generateExportPackageTitle(
  episodeTitle: string,
  platform?: string
): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = episodeTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return platform ? `${slug}_${platform}_${date}` : `${slug}_export_${date}`;
}

export function generateAssetFileName(
  platform: string,
  assetType: string,
  index: number
): string {
  return `${platform}_${assetType}_${String(index).padStart(3, "0")}.png`;
}
