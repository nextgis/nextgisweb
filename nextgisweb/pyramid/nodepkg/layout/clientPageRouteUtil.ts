import { matchRoutes } from "react-router-dom";
import type { Params, RouteObject } from "react-router-dom";

let clientPageRoutes: RouteObject[] = [];

export function setClientPageRoutes(routes: RouteObject[]) {
  clientPageRoutes = routes;
}

export function isClientPagePath(pathname: string) {
  return matchRoutes(clientPageRoutes, pathname) !== null;
}

export function getClientPageBasename() {
  const pathname = new URL(ngwConfig.applicationUrl).pathname;
  return pathname.replace(/\/$/, "") || "/";
}

export function stripClientPageBasename(pathname: string, basename: string) {
  if (basename === "/") {
    return pathname;
  }

  if (pathname === basename) {
    return "/";
  }

  if (pathname.startsWith(`${basename}/`)) {
    return pathname.slice(basename.length);
  }

  return undefined;
}

export function getClientPageLocation(url: string) {
  const parsed = new URL(url, window.location.href);

  if (parsed.origin !== window.location.origin) {
    return undefined;
  }

  const basename = getClientPageBasename();
  const pathname = stripClientPageBasename(parsed.pathname, basename);

  if (pathname === undefined) {
    return undefined;
  }

  return {
    pathname,
    to: `${pathname}${parsed.search}${parsed.hash}`,
  };
}

export function requireClientRouteParam(
  params: Params<string>,
  name: string
): string {
  const value = params[name];

  if (value === undefined) {
    throw new Error(`Missing route parameter: ${name}`);
  }

  return value;
}

export function numberClientRouteParam(
  params: Params<string>,
  name: string
): number {
  const value = Number(requireClientRouteParam(params, name));

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric route parameter: ${name}`);
  }

  return value;
}

export function formatPercentTemplate(
  template: string,
  ...values: unknown[]
): string {
  let index = 0;

  return template.replace(/%[sd]/g, (match) => {
    if (index >= values.length) {
      return match;
    }

    return String(values[index++]);
  });
}
