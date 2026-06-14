import { globSync } from "glob";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { Rspack } from "@rsbuild/core";
import { sortBy } from "lodash-es";

import config from "./config";
import { COLLECTIONS } from "./icon/util.cjs";
import tagParser from "./tag-parser";
import { stripIndex } from "./util";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

type EntryType = "entrypoint" | "plugin" | "registry" | "testentry";

type ParsedEntry = {
  type: EntryType | string;
  entrypoint?: string;
  plugin?: string;
  registry?: string;
  testentry?: string;
};

type Entry = ParsedEntry & {
  entry: string;
  fullname: string;
};

type Registry = {
  component: string | null;
  entry: string;
  fullname: string;
  loaderFile: string;
  loaderModule: string;
  pluginFiles: string[];
  pluginModules: string[];
};

type LocaleInfo = {
  key: string;
  original: string;
  filename: string;
};

function scanForEntries(): Entry[] {
  const result: Entry[] = [];
  for (const pkg of config.packages) {
    for (const candidate of globSync("**/*.{js,ts,tsx}", {
      cwd: pkg.path,
      ignore: ["node_modules/**", "contrib/**"],
    })) {
      const fn = pkg.path + "/" + candidate;
      const tag = tagParser(fn);
      if (tag) {
        result.push({
          ...tag,
          entry: pkg.name + "/" + stripIndex(candidate),
          fullname: path.resolve(fn),
        });
      }
    }
  }
  return result;
}

const entrypoints = scanForEntries();
const plRegistries: Record<string, Registry> = {};
const plFileToRegistry: Record<string, Registry> = {};

const registryExtensions = [
  "",
  ".js",
  ".ts",
  ".tsx",
  "/index.js",
  "/index.ts",
  "/index.tsx",
];

function normalizePath(value: string): string {
  return path.resolve(value).replaceAll("\\", "/");
}

entrypoints
  .filter(({ type }) => type === "registry")
  .forEach(({ entry, fullname }) => {
    const loaderFile = fullname.replace(/\.[tj]?sx?$/, ".inc.ts");
    const loaderModule = fullname.replace(/(\.[tj]?sx?)?$/, ".inc");
    plFileToRegistry[normalizePath(fullname)] = plRegistries[entry] = {
      component: config.pathToComponent(fullname),
      entry,
      fullname,
      loaderFile,
      loaderModule,
      pluginFiles: [],
      pluginModules: [],
    };
  });

function resolveRegistryRequest(
  context: string | undefined,
  request: string | undefined
): Registry | undefined {
  if (!request) return;

  if (request.startsWith(".") && context) {
    const base = path.resolve(context, request);
    for (const ext of registryExtensions) {
      const candidate = normalizePath(base + ext);
      const registry = plFileToRegistry[candidate];
      if (registry) return registry;
    }
  } else if (path.isAbsolute(request)) {
    return plFileToRegistry[normalizePath(request)];
  } else {
    return plRegistries[request];
  }
}

function shouldRedirectToRegistryLoader(
  issuer: string | undefined,
  registry: Registry
): boolean {
  if (!issuer) return true;

  issuer = normalizePath(issuer);
  if (issuer === normalizePath(registry.loaderFile)) return false;
  if (registry.pluginFiles.map(normalizePath).includes(issuer)) return false;
  return true;
}

function registryRedirect(
  context: string | undefined,
  request: string | undefined,
  issuer: string | undefined
): string | undefined {
  const registry = resolveRegistryRequest(context, request);
  if (registry && shouldRedirectToRegistryLoader(issuer, registry)) {
    return registry.loaderFile;
  }
}

function pyramidI18nRedirect(
  context: string | undefined,
  request: string | undefined,
  issuer: string | undefined
): string | undefined {
  if (!context || !request || !issuer) return;

  let match = false;
  if (request === "@nextgisweb/pyramid/i18n") {
    match = true;
  } else if (request.startsWith(".") && request.endsWith("/i18n")) {
    const joined = normalizePath(path.resolve(context, request));
    match = joined.endsWith("/nextgisweb/pyramid/nodepkg/i18n");
  }

  if (match) {
    const comp =
      config.pathToComponent(issuer) || config.pathToComponent(context);
    if (comp) return `@nextgisweb/jsrealm/i18n/comp/${comp}.inc`;
  }
}

const REGISTRY_REPLACEMENT_PLUGIN = "RegistryReplacementPlugin";

export const registryReplacementPlugin: Rspack.RspackPluginInstance = {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      REGISTRY_REPLACEMENT_PLUGIN,
      (_compilation, { normalModuleFactory }) => {
        normalModuleFactory.hooks.beforeResolve.tap(
          REGISTRY_REPLACEMENT_PLUGIN,
          (resolveData) => {
            const { context, request, contextInfo } = resolveData;
            const issuer = contextInfo?.issuer;
            const redirected =
              registryRedirect(context, request, issuer) ||
              pyramidI18nRedirect(context, request, issuer);

            if (redirected) {
              resolveData.request = redirected;
            }
          }
        );
      }
    );
  },
};

const plRegExp = /\s+from\s+["](@nextgisweb\/[^"]*)["];/g;
entrypoints
  .filter(({ type }) => type === "plugin")
  .forEach(({ entry, plugin, fullname }) => {
    let registry = plugin;
    if (!registry) {
      const body = fs.readFileSync(fullname, "utf8");
      for (const [_, n] of body.matchAll(plRegExp)) {
        if (plRegistries[n] !== undefined) {
          registry = n;
          break;
        }
      }
    }

    const registryObject = registry ? plRegistries[registry] : undefined;
    if (registryObject) {
      registryObject.pluginFiles.push(fullname);
      registryObject.pluginModules.push(entry);
    } else {
      console.log(`Registry missing for ${entry}`);
    }
  });

entrypoints
  .filter(({ type }) => type === "registry")
  .forEach(({ entry, fullname, registry }) => {
    const registryName = registry || config.pathToModule(fullname, true);
    if (!registryName) {
      throw new Error(`Registry module missing for ${fullname}`);
    }

    const registryObject = plRegistries[registryName];
    const plugins = registryObject.pluginModules;

    const code = [
      `/* eslint-disable prettier/prettier */`,
      `/* eslint-disable import-x/order */`,
      `/* eslint-disable import-x/namespace */`,
      `/* eslint-disable @typescript-eslint/no-unused-expressions */`,
      ``,
      `import { registry } from "${entry}";`,
      ...plugins.map((f, i) => `import * as p${i + 1} from "${f}";`),
      ``,
      `export * from "${entry}";`,
    ];

    if (registryName === "@nextgisweb/jsrealm/entrypoint/registry") {
      code.push(``, `// JSRealm entries`);
      config.jsrealm.entries.forEach(([component, module]) => {
        code.push(
          ``,
          `registry.register("${component}", {`,
          `    identity: "${module}",`,
          `    value: () => import("${module}"),`,
          `});`
        );
      });

      // Register entrypoint marked with "@entrypoint" in the entrypoint
      // registry. Eventually, we'll eliminate "@entrypoint" marker at
      // all, and this block will be deleted.

      code.push(``, `// Legacy @entrypoints`);
      entrypoints
        .filter(({ type }) => type === "entrypoint")
        .forEach(({ entry, fullname }) => {
          const component = config.pathToComponent(fullname);
          code.push(
            ``,
            `registry.register("${component}", {`,
            `    identity: "${entry}",`,
            `    value: () => import("${entry}"),`,
            `});`
          );
        });

      code.push(``, `// Other`, ``);
    } else if (registryName === "@nextgisweb/jsrealm/plugin/meta") {
      for (const [entry, itm] of Object.entries(plRegistries)) {
        // Do not include meta registry itself
        if (entry === registryName) continue;
        code.push(
          ``,
          `registry.registerLoader(`,
          `    "${itm.component}",`,
          `    () => import("${entry}").then(({ registry }) => registry as any),`,
          `    { identity: "${entry}" }`,
          `);`
        );
      }
    } else if (registryName === "@nextgisweb/jsrealm/testentry/registry") {
      const testentries = sortBy(
        entrypoints
          .filter(({ type }) => type === "testentry")
          .map(({ entry, testentry, fullname }) => ({
            component: config.pathToComponent(fullname),
            driver: testentry,
            entry,
          })),
        ["entry"]
      );

      for (const { component, driver, entry } of testentries) {
        code.push(
          ``,
          `registry.register("${component}", {`,
          `    identity: "${entry}",`,
          `    driver: "${driver}",`,
          `    value: () => import("${entry}")`,
          `});`
        );
      }
    }

    code.push("", "registry.seal();");

    if (plugins.length > 0) {
      // Side-effect to prevent tree shaking
      const px = plugins.map((_, i) => `p${i + 1}`);
      code.push("", `[${px.join(", ")}];`);
    }

    const codeString = code.join("\n") + "\n";
    if (
      !fs.existsSync(registryObject.loaderFile) ||
      fs.readFileSync(registryObject.loaderFile, "utf8") !== codeString
    ) {
      fs.writeFileSync(registryObject.loaderFile, codeString);
    }
  });

function scanLocales(pkg: string, subpath = ""): Record<string, LocaleInfo> {
  const root = require.resolve(pkg + "/package.json");
  const pattern = path.resolve(root, "..", subpath, "locale/*.js");
  const result: Record<string, LocaleInfo> = {};
  for (const filename of globSync(pattern)) {
    const m = filename.match(/\/([a-z]{2}(?:[-_][a-z]{2})?)\.js$/i);
    if (m) {
      const original = m[1];
      const key = original.replace("_", "-").toLowerCase();
      result[key] = { key, original, filename };
    }
  }
  return result;
}

const DEFAULT_COUNTRY_FOR_LANGUAGE: Record<string, string> = {
  en: "us",
  cs: "cz",
};

function lookupLocale(
  key: string,
  map: Record<string, LocaleInfo>
): LocaleInfo {
  const m = key.match(/^(\w+)-(\w+)$/);
  const [lang, cnt] = m ? [m[1], m[2]] : [key, undefined];

  const test: string[] = [];

  if (cnt) {
    test.push(`${lang}-${cnt}`);
  } else {
    const cfl = DEFAULT_COUNTRY_FOR_LANGUAGE[lang];
    test.push(cfl ? `${lang}-${cfl}` : `${lang}-${lang}`);
  }

  test.push(lang);

  for (const c of test) {
    const m = map[c];
    if (m) return m;
  }

  if (key !== "en") return lookupLocale("en", map);

  throw "Locale 'en' not found!";
}

const antdLocales = scanLocales("antd", "es");
const dayjsLocales = scanLocales("dayjs");

const jsrealmPackageJson = require.resolve("@nextgisweb/jsrealm/package.json");
const i18nCompDir = path.resolve(jsrealmPackageJson, "../i18n/comp");
const i18nLangDir = path.resolve(jsrealmPackageJson, "../i18n/lang");

const gettextReexport = [];
for (const p of ["", "n", "p", "np"]) {
  for (const s of ["", "f"]) {
    gettextReexport.push(`${p}gettext${s}`);
  }
}

for (const comp of Object.keys(config.env.components)) {
  const code = [
    'import { domain as domainFactory } from "@nextgisweb/pyramid/i18n/gettext";\n',
    `const domain = domainFactory("${comp}");\n`,
    "export const {",
    ...gettextReexport.map((i) => `    ${i},`),
    "} = domain;\n",
    "export default domain;",
  ];
  const fn = path.join(i18nCompDir, `${comp}.inc.ts`);
  fs.writeFileSync(fn, code.join("\n") + "\n");
}

for (const { code: lang, nplurals, plural } of config.i18n.languages) {
  const antd = lookupLocale(lang, antdLocales);
  const dayjs = lookupLocale(lang, dayjsLocales);

  const pofiles: string[] = [];
  Object.values(config.env.components).forEach((path) => {
    pofiles.push(...globSync(path + `/locale/${lang}.po`));
  });

  if (config.i18n.external) {
    pofiles.push(...globSync(config.i18n.external + `/*/*/${lang}.po`));
  }

  const code = [
    "/* eslint-disable eqeqeq */",
    "/* eslint-disable @typescript-eslint/no-unused-vars */",
    "/* eslint-disable prettier/prettier */",
    `import { default as antd } from "${antd.filename}";`,
    `import dayjs from "@nextgisweb/gui/dayjs";`,
    `import "${dayjs.filename}";\n`,
    ...pofiles.map((fn) => `import "${path.resolve(fn)}";`),
    "",
    `dayjs.locale("${dayjs.original}");`,
    `ngwConfig.plurals = [${nplurals}, (n) => Number(${plural})];`,
    "export { antd }",
  ];
  const fn = path.join(i18nLangDir, `${lang}.inc.ts`);
  fs.writeFileSync(fn, code.join("\n") + "\n");
}

export const sharedIconIds: Record<string, string> = {};
const iconsCollection: string[] = [];
const iconTypeDefs: string[] = [];

for (const [comp, compDir] of Object.entries(config.env.components)) {
  const iconDir = path.resolve(compDir, "icon");
  if (!fs.existsSync(iconDir)) continue;

  const mod = ["@nextgisweb", comp.replace("_", "-"), "icon", "*"].join("/");
  const resourceDir = path.join(iconDir, "resource");
  for (const fn of globSync("**/*.svg", {
    cwd: iconDir,
    absolute: true,
  })) {
    if (fn.startsWith(resourceDir)) {
      const id = fn.replace(/.*\/(\w+)\.svg$/, (m, n) => `icon-rescls-${n}`);
      sharedIconIds[fn] = id;
    } else if (!iconTypeDefs.includes(mod)) {
      iconTypeDefs.push(mod);
    }
  }
}

for (const [collection, ...rest] of config.jsrealm.icons) {
  const suf = rest.filter((i): i is string => !!i);
  if (collection in COLLECTIONS) {
    iconsCollection.push(`@nextgisweb/icon/${collection}/${suf}`);
  } else {
    const compDir = path.resolve(config.env.components[collection]);
    const fn = path.join(compDir, "icon", ...suf) + ".svg";
    const id = `icon-${collection}-${suf.join("-")}`;
    sharedIconIds[fn] = id;
  }
}

fs.writeFileSync(
  path.join(__dirname, "icon.inc.ts"),
  Object.keys(sharedIconIds)
    .concat(iconsCollection)
    .map((i) => `import "${i}";`)
    .join("\n") + "\n"
);

fs.writeFileSync(
  path.join(__dirname, "../icon/comp.inc.d.ts"),
  iconTypeDefs
    .map((m) => {
      return [
        `declare module "${m}" {`,
        `    import type { IconComponent } from "@nextgisweb/icon";\n`,
        `    const value: IconComponent;`,
        `    export = value;`,
        `}\n`,
      ].join("\n");
    })
    .join("\n")
);
