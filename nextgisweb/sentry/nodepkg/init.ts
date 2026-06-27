import * as Sentry from "@sentry/browser";
import type { Integration } from "@sentry/core";

import { isAbortError } from "@nextgisweb/gui/error";
import { BaseAPIError } from "@nextgisweb/pyramid/api";

import metrics from "./metrics";
import { hasSentryIgnore } from "./util";

export function init(opts: { dsn: string; routeName: string }) {
  // Check if the environment supports ES2020 features using `eval` to avoid
  // transpilation. This includes optional chaining, nullish coalescing, and
  // other features.

  let es2022 = false;
  try {
    es2022 = eval(
      "class C { static #f = true; t() { return C.#f } }; " +
        "((undefined?.() ?? Number.MAX_SAFE_INTEGER) === 9007199254740991) " +
        "&& !!Promise.allSettled && !!String.prototype.matchAll " +
        "&& ((...rest) => rest[0])(true) && ((v = true) => v)() " +
        "&& (new C()).t()"
    );
  } catch {
    // Assume ES2022 is unsupported
  }

  // Skip Sentry initialization if ES2022 features are not supported
  if (!es2022) {
    console.warn("Sentry initialization skipped: ES2022 not supported.");
    return;
  }

  const { routeName, ...sentryOpts } = opts;

  const integrations: Integration[] = [
    Sentry.captureConsoleIntegration({ levels: ["error"] }),
  ];

  let suppressFurtherEvents = false;

  interface ChunkErrorInfo {
    request?: string;
    type?: unknown;
  }

  const getChunkErrorInfo = (error: unknown): ChunkErrorInfo | undefined => {
    if (
      error instanceof Error &&
      (error.name === "ChunkLoadError" ||
        ("code" in error && error.code === "CSS_CHUNK_LOAD_FAILED"))
    ) {
      let request =
        "request" in error && typeof error.request === "string"
          ? error.request || undefined
          : undefined;

      if (request) {
        const url = new URL(request, location.origin);
        request = url.pathname + url.search;
      }

      const type = ("type" in error ? error.type : undefined) || undefined;

      return { request, type };
    }
  };

  Sentry.init({
    ...sentryOpts,
    sendDefaultPii: true,
    integrations,

    initialScope: (scope) => {
      scope.setUser({ id: ngwConfig.instanceId, ip_address: "{{auto}}" });
      scope.setTransactionName(routeName);
      return scope;
    },

    beforeSend(event, hint) {
      if (suppressFurtherEvents) return null;

      const error = hint.originalException;

      if (hasSentryIgnore(error)) {
        return null;
      }

      // Too many abort errors captured, ignore them
      if (isAbortError(error)) {
        return null;
      }

      // The server has its own logic for reporting API errors, so skip
      // client-side reporting.
      if (error instanceof BaseAPIError) {
        return null;
      }

      // Chunk load errors are considered fatal. This can also happen in legacy
      // browsers due to unsupported JavaScript syntax (e.g., ??=).
      const chunkErrorInfo = getChunkErrorInfo(error);
      if (chunkErrorInfo) {
        metrics.count(COMP_ID, "chunk_error", 1, {
          attributes: {
            ["chunk_error.request"]: chunkErrorInfo.request,
            ["chunk_error.type"]: chunkErrorInfo.type,
          },
        });
        suppressFurtherEvents = true;
        Sentry.getClient()?.close();
        return null;
      }

      return event;
    },
  });

  window.ngwSentry = Sentry;
}
