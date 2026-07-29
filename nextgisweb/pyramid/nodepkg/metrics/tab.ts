/** @registry */
import { lazy } from "react";
import type { FC, LazyExoticComponent } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
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
    widget: LazyExoticComponent<FC<TabProps<K>>>;
  };
}[keyof Metrics];

export const registry = pluginRegistry<PluginValue>(MODULE_NAME);

const GoogleAnalyticsTabLazy = lazy(() => import("./GoogleAnalyticsTab"));
const YandexMetricaTabLazy = lazy(() => import("./YandexMetricaTab"));

registry.register(COMP_ID, {
  key: "google_analytics",
  label: gettext("Google Analytics"),
  widget: GoogleAnalyticsTabLazy,
});

registry.register(COMP_ID, {
  key: "yandex_metrica",
  label: gettext("Yandex.Metrica"),
  widget: YandexMetricaTabLazy,
});
