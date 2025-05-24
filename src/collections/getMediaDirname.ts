import path from 'path';
import { fileURLToPath } from 'url';

export function getMediaDirname() {
  return path.dirname(fileURLToPath(import.meta.url));
}
