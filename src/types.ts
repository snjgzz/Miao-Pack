export type ThemeName = "light" | "dark";

export type Screen = {
  id: string;
  path: string;
  title: string;
  group: string;
  theme: ThemeName;
  description?: string;
};

export type PackDocs = {
  packJson?: string;
  readme?: string;
  featureMap?: string;
  styleGuide?: string;
};

export type GeneratorSpec = {
  command: string;
  args: string[];
  label: string;
};

export type Issue = {
  level: "error" | "warning";
  message: string;
  path?: string;
};

export type IndexedPack = {
  name: string;
  displayName: string;
  version: string;
  description: string;
  accent: string;
  root: string;
  themes: ThemeName[];
  screens: Screen[];
  docs: PackDocs;
  tools: string[];
  generator: GeneratorSpec | null;
  htmlCount: number;
  inferred: boolean;
  issues: Issue[];
  mtimeMs: number;
  recent: boolean;
  docBadge: string;
};

export type IndexState = {
  assetRoot: string;
  extraPacks: string[];
  appTheme: "light" | "dark";
  version: string;
  indexedAt: string;
  revision: string;
  pageCount: number;
  packCount: number;
  packs: IndexedPack[];
  mcp: {
    command: string;
    args: string[];
    npx: { command: string; args: string[] };
  };
};

export type FileContent = {
  path: string;
  content: string;
  bytes: number;
  kind: "html" | "markdown" | "json" | "python" | "text";
};

export type RegenResult = {
  pack: string;
  command: string;
  scope: string;
  wrote: number;
  stdout: string;
  stderr: string;
};

export class PackError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PackError";
    this.status = status;
  }
}
