import * as Sentry from "@sentry/browser";
import type { Integration } from "@sentry/core";

export function init(opts: { dsn: string; routeName: string }) {
    const integrations: Integration[] = [];
    const { routeName, ...sentryOpts } = opts;

    Sentry.init({
        ...sentryOpts,
        integrations,
        maxBreadcrumbs: 50,
        debug: false,

        initialScope: (scope) => {
            scope.setUser({ id: ngwConfig.instanceId, ip_address: "{{auto}}" });
            scope.setTransactionName(routeName);
            return scope;
        },
    });
}
