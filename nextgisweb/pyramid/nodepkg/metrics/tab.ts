/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";
import type { Metrics } from "@nextgisweb/pyramid/type/api";

import { gettext } from "../i18n";

export type TabValue<K extends keyof Metrics = keyof Metrics> = NonNullable<
    Metrics[K]
>;

export interface TabProps<K extends keyof Metrics = keyof Metrics> {
    value: TabValue<K> | null;
    onChange: (value: TabValue<K> | null) => void;
    readonly: boolean;
}

type PluginValue = {
    [K in keyof Metrics]-?: {
        key: K;
        label: string;
        widget: ImportCallback<FC<TabProps<K>>>;
    };
}[keyof Metrics];

export const registry = pluginRegistry<PluginValue>(MODULE_NAME);

registry.register(COMP_ID, {
    key: "google_analytics",
    label: gettext("Google Analytics"),
    widget: () => import("./GoogleAnalyticsTab"),
});

registry.register(COMP_ID, {
    key: "yandex_metrica",
    label: gettext("Yandex.Metrica"),
    widget: () => import("./YandexMetricaTab"),
});
