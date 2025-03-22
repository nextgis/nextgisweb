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
            if (error instanceof BaseAPIError) {
                return null;
            }

            return event;
        },
    });

    (window as any).ngwSentry = Sentry;
}
