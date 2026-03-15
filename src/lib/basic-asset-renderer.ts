export interface RenderParams {
  width: number;
  height: number;
  text: string;
  title?: string;
  platform?: string;
  podcast_name?: string;
  asset_type?: string;
  bg_color?: string;
  text_color?: string;
  accent_color?: string;
}

export async function renderBasicAssetToPng(params: RenderParams): Promise<Blob> {
  const {
    width,
    height,
    text,
    title,
    platform = "",
    podcast_name = "AMTME",
    bg_color = "#111111",
    text_color = "#ffffff",
    accent_color = "#f97316",
  } = params;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = bg_color;
  ctx.fillRect(0, 0, width, height);

  // Left accent bar
  ctx.fillStyle = accent_color;
  ctx.fillRect(0, 0, 8, height);

  // Podcast name (top-right)
  const brandSize = Math.round(width * 0.025);
  ctx.fillStyle = accent_color;
  ctx.font = `700 ${brandSize}px sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(podcast_name.toUpperCase(), width - 40, 50);

  // Platform label (top-left)
  if (platform) {
    ctx.fillStyle = text_color + "99";
    ctx.font = `400 ${Math.round(width * 0.02)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(platform.toUpperCase(), 32, 50);
  }

  // Main quote text (wrapped)
  const maxTextWidth = width - 80;
  const quoteSize = Math.round(width * 0.045);
  ctx.fillStyle = text_color;
  ctx.font = `600 ${quoteSize}px sans-serif`;
  ctx.textAlign = "left";

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxTextWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineHeight = quoteSize * 1.45;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, 40, startY + idx * lineHeight);
  });

  // Episode title (bottom)
  if (title) {
    const titleSize = Math.round(width * 0.022);
    ctx.fillStyle = text_color + "99";
    ctx.font = `400 ${titleSize}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(title.slice(0, 60), 40, height - 40);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/png",
      0.95
    );
  });
}

export function getPlatformDimensions(
  platform: string,
  assetType: string
): { width: number; height: number } {
  if (platform === "tiktok" || assetType === "reel") return { width: 1080, height: 1920 };
  if (platform === "youtube" || assetType === "thumbnail") return { width: 1280, height: 720 };
  if (platform === "twitter" || platform === "linkedin") return { width: 1200, height: 675 };
  return { width: 1080, height: 1080 };
}
