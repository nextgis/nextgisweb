/** @registry pyramid/metrics/tab */
import type { FC } from "react";

import { PluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { Metrics } from "@nextgisweb/pyramid/type/api";

import { gettext } from "../i18n";

export interface TabProps<TV> {
    value: TV | null;
    onChange: (value: TV | null) => void;
    readonly: boolean;
}

export interface MetadataType {
    readonly key: keyof Metrics;
    readonly label: string;
}

type PluginDistribute<TV> = TV extends unknown ? FC<TabProps<TV>> : never;
type PluginValue = NonNullable<Metrics[keyof Metrics]>;
export type Plugin = PluginDistribute<PluginValue>;

export const registry = new PluginRegistry<Plugin, MetadataType>(
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
