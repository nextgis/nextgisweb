/** @entrypoint */
import * as Sentry from "@sentry/browser";
import type { Integration } from "@sentry/core";

export function init(opts: { dsn: string; routeName: string }) {
    const integrations: Integration[] = [];
    const { routeName, ...sentryOpts } = opts;

    let suppressEvents = false;

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

        beforeSend: (event, hint) => {
            if (suppressEvents) return null;

            const error = hint.originalException;
            if (error && typeof error === "object") {
                if ("src" in error && error.src === "dojoLoader") {
                    const value = event.exception?.values?.[0];
                    if (value) {
                        value.type = "DojoLoaderError";
                        const info = "info" in error && error.info;
                        if (info && Array.isArray(info)) {
                            let url = info[0];
                            if (typeof url === "string") {
                                if (url.startsWith(ngwConfig.applicationUrl)) {
                                    url = url.slice(
                                        ngwConfig.applicationUrl.length
                                    );
                                }
                                value.value = "Failed to load " + url;
                            }
                        }
                    }

                    // Send only this error and suppress future events, as the
                    // dojoLoader error is almost always fatal.
                    suppressEvents = true;
                }
            }

            return event;
        },
    });

    // See https://dojotoolkit.org/reference-guide/1.10/loader/amd.html#error-reporting
    // @ts-expect-error Dojo AMD events API
    window.require.on("error", function (error) {
        Sentry.captureException(error);
    });
}
