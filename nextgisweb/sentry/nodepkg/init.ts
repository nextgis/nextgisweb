/** @entrypoint */
import * as Sentry from "@sentry/browser";
import type { Integration } from "@sentry/types";

export function init(opts: { dsn: string }) {
    const integrations: Integration[] = [];

    Sentry.init({
        ...opts,
        integrations,
        maxBreadcrumbs: 50,
        debug: false,
    });
}
