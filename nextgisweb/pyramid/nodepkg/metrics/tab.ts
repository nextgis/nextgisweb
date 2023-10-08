/** @registry pyramid/metrics/tab */
import type { FC } from "react";

import { PluginRegistry } from "@nextgisweb/jsrealm/plugin";

import { gettext } from "../i18n";

import type { TV as GoogleAnalytics } from "./GoogleAnalyticsTab";
import type { TV as YandexMetric } from "./YandexMetricaTab";
import type { PyramidMetricsKey } from "./type";

export interface TabProps<TV> {
    value: TV | null;
    onChange: (value: TV | null) => void;
    readonly: boolean;
}

export interface MetadataType {
    readonly key: PyramidMetricsKey;
    readonly label: string;
}

type PluginRegistryValue =
    | FC<TabProps<YandexMetric>>
    | FC<TabProps<GoogleAnalytics>>;

export const registry = new PluginRegistry<PluginRegistryValue, MetadataType>(
    "pyramid/metrics/tab"
);

registry.register({
    component: "pyramid",
    key: "google_analytics",
    label: gettext("Google Analytics"),
    import: () => import("./GoogleAnalyticsTab"),
});

registry.register({
    component: "pyramid",
    key: "yandex_metrica",
    label: gettext("Yandex.Metrica"),
    import: () => import("./YandexMetricaTab"),
});
