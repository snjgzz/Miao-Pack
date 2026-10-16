import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type AppConfig = {
  assetRoot?: string;
  extraPacks: string[];
  appTheme: "light" | "dark";
};

export function defaultConfigPath(): string {
  if (process.env.MIAO_PACK_CONFIG) return path.resolve(process.env.MIAO_PACK_CONFIG);
  return path.join(os.homedir(), ".miao-pack", "config.json");
}

export function readConfig(configPath: string): AppConfig | null {
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as Partial<AppConfig>;
    const theme = raw.appTheme === "dark" ? "dark" : "light";
    const extraPacks = Array.isArray(raw.extraPacks)
      ? raw.extraPacks.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    return {
      assetRoot: typeof raw.assetRoot === "string" && raw.assetRoot.trim() ? raw.assetRoot : undefined,
      extraPacks,
      appTheme: theme,
    };
  } catch {
    return null;
  }
}

export function writeConfig(configPath: string, config: AppConfig): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}
