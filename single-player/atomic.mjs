// Durable file writes: write to a tmp file, fsync it so the bytes are on disk, then rename
// over the target (rename is atomic on the same filesystem).
import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeSync } from "node:fs";

export function writeFileAtomic(path, bytes) {
  const tmpPath = `${path}.tmp`;
  try {
    const fd = openSync(tmpPath, "w");
    try {
      writeSync(fd, bytes);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmpPath, path);
  } catch (error) {
    try { rmSync(tmpPath, { force: true }); } catch { /* best effort */ }
    error.message += "; the save was not changed";
    throw error;
  }
}
