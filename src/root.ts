import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory that contains package.json, whether running from src/ via tsx or dist/. */
export function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..");
}
