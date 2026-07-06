import type { PyramidSettingsResponseTyped } from "@nextgisweb/pyramid/type/api";

import { route } from "./api";

type CSTypedComponent = PyramidSettingsResponseTyped["component"];

async function fetchSettings<C extends CSTypedComponent>(
  component: C
): Promise<PyramidSettingsResponseTyped & { component: C }>;

async function fetchSettings<T>(component: string): Promise<T>;

async function fetchSettings(component: string) {
  if (window.ngwSentry) {
    window.ngwSentry.addBreadcrumb({
      level: "debug",
      message: `Fetching settings for component: ${component}`,
      data: { component },
    });
  }

  const result = await route("pyramid.settings").get({
    query: { component: component as any },
    // NOTE: Caching disabled as an attempt to fix NGW-1920
    // cache: true,
  });

  if (window.ngwSentry) {
    window.ngwSentry.addBreadcrumb({
      level: "debug",
      message: `Fetched settings for component: ${component}`,
      data: { component, result },
    });
  }

  return result;
}

export { fetchSettings };
