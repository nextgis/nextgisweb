/** @registry pyramid/metrics/tab */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { FC } from "react";

export interface TabProps<TV> {
    value: TV | null;
    onChange: (value: TV | null) => void;
    readonly: boolean;
}

export interface MetadataType {
    readonly key: string;
    readonly label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry = new PluginRegistry<FC<TabProps<never>>, MetadataType>(
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
