export interface TranscriptSegmentForSrt {
  start_seconds: number;
  end_seconds: number;
  text: string;
}

function pad(num: number, size = 2) {
  return String(num).padStart(size, "0");
}

function formatSrtTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  const milliseconds = Math.round((safe - Math.floor(safe)) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

export function buildSrt(segments: TranscriptSegmentForSrt[]) {
  return segments
    .map((segment, index) => {
      return [
        String(index + 1),
        `${formatSrtTime(Number(segment.start_seconds))} --> ${formatSrtTime(Number(segment.end_seconds))}`,
        segment.text.trim(),
      ].join("\n");
    })
    .join("\n\n");
}

export function downloadSrt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".srt") ? filename : `${filename}.srt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
