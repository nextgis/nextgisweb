import * as Sentry from "@sentry/browser";
import type { Integration } from "@sentry/core";

import { isAbortError } from "@nextgisweb/gui/error";
import { BaseAPIError } from "@nextgisweb/pyramid/api";

export function init(opts: { dsn: string; routeName: string }) {
    // Check if the environment supports ES2020 features using `eval` to avoid
    // transpilation. This includes optional chaining, nullish coalescing, and
    // other features.

    let es2020 = false;
    try {
        es2020 = eval(
            "((undefined?.() ?? Number.MAX_SAFE_INTEGER) === 9007199254740991) " +
                "&& !!Promise.allSettled && !!String.prototype.matchAll " +
                "&& ((...rest) => rest[0])(true)"
        );
    } catch {
        // Assume ES2020 is unsupported
    }

    // Skip Sentry initialization if ES2020 features are not supported
    if (!es2020) {
        console.warn("Sentry initialization skipped: ES2020 not supported.");
        return;
    }

    const { routeName, ...sentryOpts } = opts;

    const integrations: Integration[] = [
        Sentry.captureConsoleIntegration({ levels: ["error"] }),
    ];

    Sentry.init({
        ...sentryOpts,
        integrations,

        initialScope: (scope) => {
            scope.setUser({ id: ngwConfig.instanceId, ip_address: "{{auto}}" });
            scope.setTransactionName(routeName);
            return scope;
        },

        beforeSend(event, hint) {
            const error = hint.originalException;

            // Too many abort errors captured, ignore them
            if (isAbortError(error)) {
                return null;
            }

            // The server has its own logic for reporting API errors, so skip
            // client-side reporting.
            if (error instanceof BaseAPIError) {
                return null;
            }

            // Webpack's ChunkLoadError is considered fatal. This can also happen
            // in legacy browsers due to unsupported JavaScript syntax (e.g., ??=).
            if (error instanceof Error && error.name === "ChunkLoadError") {
                Sentry.getClient()?.close();
                return null;
            }

            return event;
        },
    });

    window.ngwSentry = Sentry.getClient();
}
