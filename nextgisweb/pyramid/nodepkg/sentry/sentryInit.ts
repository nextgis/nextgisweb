import * as Sentry from "@sentry/browser";

export const sentryInit = () => {
    Sentry.init({
        dsn: "https://158076b84a8f30a2ca6afe2298e1fce1@o4507486153998336.ingest.de.sentry.io/4507502893596752",
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        maxBreadcrumbs: 50,
        debug: false,
        tracesSampleRate: 1.0,
    });
};
