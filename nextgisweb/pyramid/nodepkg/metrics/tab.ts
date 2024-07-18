/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { Metrics } from "@nextgisweb/pyramid/type/api";

import { gettext } from "../i18n";

export interface TabProps<TV> {
    value: TV | null;
    onChange: (value: TV | null) => void;
    readonly: boolean;
}

type PluginDistribute<TV> = TV extends unknown ? FC<TabProps<TV>> : never;
type PluginValue = NonNullable<Metrics[keyof Metrics]>;

export const registry = pluginRegistry<
    PluginDistribute<PluginValue>,
    { key: keyof Metrics; label: string }
>(MODULE_NAME);

registry.register(
    {
        component: COMP_ID,
        key: "google_analytics",
        label: gettext("Google Analytics"),
    },
    { import: () => import("./GoogleAnalyticsTab") }
);

registry.register(
    {
        component: COMP_ID,
        key: "yandex_metrica",
        label: gettext("Yandex.Metrica"),
    },
    { import: () => import("./YandexMetricaTab") }
);
