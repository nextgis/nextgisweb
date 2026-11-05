import type { PyramidSettingsResponse } from "@nextgisweb/pyramid/type/api";

import { route } from "./api";

type CSTypedComponent = PyramidSettingsResponse["component"];

async function fetchSettings<C extends CSTypedComponent>(
  component: C
): Promise<PyramidSettingsResponse & { component: C }>;

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
    cache: true,
    requestCache: "no-store",
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
