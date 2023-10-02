import type { FC } from "react";
import type { TabProps } from "./tab";

import type { TV as YandexMetric } from "./YandexMetricaTab";
import type { TV as GoogleAnalytics } from "./GoogleAnalyticsTab";

export interface PyramidMetrics {
    yandex_metrica?: YandexMetric;
    google_analytics?: GoogleAnalytics;
}

export type PyramidMetricsKey = keyof PyramidMetrics;

export type PyramidMetricsComponent = FC<
    TabProps<PyramidMetrics[keyof PyramidMetrics]>
>;

export interface MetricSettingsTab {
    key: PyramidMetricsKey;
    label: string;
    component: PyramidMetricsComponent;
}
