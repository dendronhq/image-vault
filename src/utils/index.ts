import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';

export function getTmpFolder() {
  const savePath = path.join(tmpdir(), "image-vault");
  if (!fs.existsSync(savePath)) { fs.mkdirSync(savePath); }
  return savePath;
}