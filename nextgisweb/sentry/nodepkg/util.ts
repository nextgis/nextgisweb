const SENTRY_IGNORE = Symbol("SENTRY_IGNORE");

interface WithSentryIgnore {
  [SENTRY_IGNORE]?: boolean;
}

/** Mark an error to be ignored by Sentry
 *
 * @param error - The error to be ignored
 */
export function sentryIgnore(error: NonNullable<unknown>): void {
  (error as WithSentryIgnore)[SENTRY_IGNORE] = true;
}

/** Check if an error is marked to be ignored by Sentry
 *
 * @param error - The error to check
 * @returns true if the error is marked to be ignored, false otherwise
 */
export function hasSentryIgnore(error: unknown): boolean {
  return (
    typeof error === "object" && !!(error as WithSentryIgnore)[SENTRY_IGNORE]
  );
}
