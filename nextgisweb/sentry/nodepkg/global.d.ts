import type * as Sentry from "@sentry/browser";

declare global {
  interface Window {
    ngwSentry?: typeof Sentry | undefined;
  }
}
