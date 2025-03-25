import * as Sentry from "@sentry/browser";
import type { Integration } from "@sentry/core";

import { BaseAPIError } from "@nextgisweb/pyramid/api";

export function init(opts: { dsn: string; routeName: string }) {
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
