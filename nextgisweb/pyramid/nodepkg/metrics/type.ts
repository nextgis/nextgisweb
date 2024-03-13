import type { FC } from "react";

import type { Metrics } from "@nextgisweb/pyramid/type/api";

import type { TabProps } from "./tab";

export type PyramidMetricsComponent = FC<TabProps<Metrics[keyof Metrics]>>;

export interface MetricSettingsTab {
    key: keyof Metrics;
    label: string;
    component: PyramidMetricsComponent;
}
