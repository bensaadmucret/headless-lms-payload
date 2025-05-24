import path from 'path';
import { fileURLToPath } from 'url';

export function getMediaDirname() {
  // Utilisation ESM uniquement
  // @ts-expect-error
  return path.dirname(fileURLToPath(import.meta.url));
}
