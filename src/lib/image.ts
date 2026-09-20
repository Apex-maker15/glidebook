"use client";

/**
 * Resize an image in the browser and return it as a JPEG data URL small enough
 * to live in a database column. Square crops for logos; wide crops for covers.
 */
export async function fileToDataUrl(
  file: File,
  opts: { maxWidth: number; maxHeight: number; aspect?: number; quality?: number; maxChars: number },
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  let sx = 0;
  let sy = 0;
  let sw = width;
  let sh = height;

  // Centre-crop to the requested aspect ratio before scaling.
  if (opts.aspect) {
    const current = width / height;
    if (current > opts.aspect) {
      sw = Math.round(height * opts.aspect);
      sx = Math.round((width - sw) / 2);
    } else if (current < opts.aspect) {
      sh = Math.round(width / opts.aspect);
      sy = Math.round((height - sh) / 2);
    }
    width = sw;
    height = sh;
  }

  const scale = Math.min(1, opts.maxWidth / width, opts.maxHeight / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Step the quality down until it fits the column limit.
  let quality = opts.quality ?? 0.86;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > opts.maxChars && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > opts.maxChars) throw new Error("That image is too detailed to shrink enough - try a simpler one");
  return out;
}
