/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { panoramaProviderRegistry } from "@nextgisweb/webmap/panorama/provider/registry";

panoramaProviderRegistry(COMP_ID, {
  identity: "google",
  title: gettext("Google Street View"),
  requiresKey: false,
  component: lazy(() => import("./google/GooglePanoramaProvider")),
  checkAvailability: async (apiKey, lat, lng) => {
    const { checkAvailability } = await import("./google/checkAvailability");
    return checkAvailability(apiKey, lat, lng);
  },
});

panoramaProviderRegistry(COMP_ID, {
  identity: "yandex",
  title: gettext("Yandex Panorama"),
  requiresKey: true,
  component: lazy(() => import("./yandex/YandexPanoramaProvider")),
  checkAvailability: async (apiKey, lat, lng) => {
    const { checkAvailability } = await import("./yandex/checkAvailability");
    return checkAvailability(apiKey, lat, lng);
  },
});
