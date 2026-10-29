/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { panoramaProviderRegistry } from "@nextgisweb/webmap/panorama/provider/registry";

const GooglePanoramaProviderLazy = lazy(
  () => import("./google/GooglePanoramaProvider")
);
const YandexPanoramaProviderLazy = lazy(
  () => import("./yandex/YandexPanoramaProvider")
);

panoramaProviderRegistry(COMP_ID, {
  identity: "google",
  title: gettext("Google Street View"),
  requiresKey: false,
  component: GooglePanoramaProviderLazy,
  checkAvailability: async (apiKey, lat, lng) => {
    const { checkAvailability } = await import("./google/api");
    return checkAvailability(apiKey, lat, lng);
  },
});

panoramaProviderRegistry(COMP_ID, {
  identity: "yandex",
  title: gettext("Yandex Panorama"),
  requiresKey: true,
  component: YandexPanoramaProviderLazy,
  checkAvailability: async (apiKey, lat, lng) => {
    const { checkAvailability } = await import("./yandex/api");
    return checkAvailability(apiKey, lat, lng);
  },
});
