import { debounce } from "lodash-es";

import { metrics } from "@nextgisweb/sentry";
import { sentryIgnore } from "@nextgisweb/sentry/util";

import { hmuxFetch } from "./hmux";

export const transparentImage =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAIBAAA=";

interface SentryReportErrorMetricOptions {
  component: string;
  baseUrl: string | undefined;
  src: string;
  name: string;
  status?: number;
}

const sentryReportErrorMetric = debounce(
  (opts: SentryReportErrorMetricOptions) => {
    let url: URL;
    try {
      url = new URL(opts.src, opts.baseUrl);
    } catch {
      return; // Invalid URL, just ignore it
    }
    metrics.count(opts.component, "tile_error", 1, {
      attributes: {
        ["tile_error.host"]: url.host,
        ["tile_error.path"]: url.pathname + url.search,
        ["tile_error.name"]: opts.name,
        ["tile_error.status"]: opts.status,
      },
    });
  },
  60_000,
  { leading: true, trailing: false }
);

interface TileLoadFunctionOptions extends Omit<RequestInit, "method" | "body"> {
  src: string;
  hmux?: boolean;
  noDataStatuses?: number[];
  sentryMetricOptions?: Pick<
    SentryReportErrorMetricOptions,
    "component" | "baseUrl"
  >;
}

export async function tileLoadFunction({
  src,
  hmux,
  noDataStatuses = [204],
  sentryMetricOptions,
  ...requestInit
}: TileLoadFunctionOptions): Promise<string> {
  let blob: Blob;
  let status: number | undefined = undefined;
  try {
    const response = await (hmux ? hmuxFetch : fetch)(src, {
      method: "GET",
      ...requestInit,
    });
    status = response.status;
    if (status === 200) {
      blob = await response.blob();
    } else if (noDataStatuses.includes(status)) {
      return transparentImage;
    } else {
      // TypeError is used here to mimic the behavior of fetch when a network
      // error occurs, which is also a TypeError.
      throw new TypeError(`Unable to load tile, status: ${status}`);
    }
  } catch (err) {
    if (
      err instanceof TypeError ||
      (err instanceof DOMException && err.name === "TimeoutError")
    ) {
      sentryIgnore(err);
      if (sentryMetricOptions) {
        sentryReportErrorMetric({
          ...sentryMetricOptions,
          src: src,
          name: err.name,
          status: status,
        });
      }
    }
    throw err;
  }
  return window.URL.createObjectURL(blob);
}
