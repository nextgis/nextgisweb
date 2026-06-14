export type PackageJson = {
  name: string;
  nextgisweb?: {
    rsbuildConfigs?: Record<string, string>;
  };
  [key: string]: unknown;
};

export type PackageConfig = {
  name: string;
  path: string;
  json: PackageJson;
};

export type JSRealmConfig = {
  debug: boolean;
  distPath: string;
  packages: PackageConfig[];
  core: {
    debug: boolean;
    [key: string]: unknown;
  };
  env: {
    components: Record<string, string>;
    [key: string]: unknown;
  };
  i18n: {
    external?: string;
    languages: {
      code: string;
      nplurals: number;
      plural: string;
    }[];
    [key: string]: unknown;
  };
  jsrealm: {
    eslint?: boolean;
    entries: [string, string][];
    icons: [string, ...(string | undefined)[]][];
    stylesheets: string[];
    targets: unknown;
    tscheck?: boolean;
    [key: string]: unknown;
  };
  pathToComponent(filename: string): string | null;
  pathToModule(filename: string, strip?: boolean): string | null;
  [key: string]: unknown;
};

declare const config: JSRealmConfig;
export default config;
