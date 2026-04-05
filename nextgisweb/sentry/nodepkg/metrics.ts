import type { metrics } from "@sentry/browser";

/** Increment a count metric by a value
 *
 * @param component - Component name, usually COMP_ID
 * @param name - Metric name, without component prefix
 * @param value - Value to increment by
 * @param options - Additional metric options
 */
function count(
  component: string,
  name: string,
  value?: number,
  options?: metrics.MetricOptions
): void {
  if (!window.ngwSentry) return;
  window.ngwSentry.metrics?.count(`${component}.${name}`, value, options);
}

/** Set a gauge metric to a value
 *
 * @param component - Component name, usually COMP_ID
 * @param name - Metric name, without component prefix
 * @param value - Value to set the gauge to
 * @param options - Additional metric options
 */
function gauge(
  component: string,
  name: string,
  value: number,
  options?: metrics.MetricOptions
): void {
  if (!window.ngwSentry) return;
  window.ngwSentry.metrics?.gauge(`${component}.${name}`, value, options);
}

/** Record a distribution metric
 *
 * @param component - Component name, usually COMP_ID
 * @param name - Metric name, without component prefix
 * @param value - Value to record in the distribution
 * @param options - Additional metric options
 */
function distribution(
  component: string,
  name: string,
  value: number,
  options?: metrics.MetricOptions
): void {
  if (!window.ngwSentry) return;
  window.ngwSentry.metrics?.distribution(
    `${component}.${name}`,
    value,
    options
  );
}

/** Flush all pending metrics */
function flush(): void {
  if (!window.ngwSentry) return;
  window.ngwSentry.flush();
}

export default { count, gauge, distribution, flush };
