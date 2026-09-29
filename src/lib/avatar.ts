"use client";
import { useEffect, useState } from "react";
import { backend } from "./backend";

/** Center-crops and shrinks a photo to a 256px square JPEG (about 20-40 KB) before upload. */
export async function squareJpeg(file: File, size = 256): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  img.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not read image"))), "image/jpeg", 0.85));
}

/** Resolves a stored avatar path to a viewable URL (signed for 12 hours in live mode). */
export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    backend.avatarUrl(path).then((u) => live && setUrl({ path, url: u }));
    return () => {
      live = false;
    };
  }, [path]);
  return path && url?.path === path ? url.url : null;
}
