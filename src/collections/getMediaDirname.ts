import * as path from 'path';
import { fileURLToPath } from 'url';

export const getMediaDirname = (): string => {
  return path.dirname(fileURLToPath(import.meta.url));
};
