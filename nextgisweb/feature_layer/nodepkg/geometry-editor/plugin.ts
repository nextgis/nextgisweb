/** @plugin */
import { lazy } from "react";

import { featureEditorRegistry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { GEOMETRY_KEY } from "./constant";

const GeometryEditorLazy = lazy(() => import("./GeometryEditor"));

featureEditorRegistry(COMP_ID, {
  store: () => import("./GeometryEditorStore"),
  provider: ({ store }) => [
    {
      widget: GeometryEditorLazy,
      store,
      label: gettext("Geometry"),
      identity: GEOMETRY_KEY,
      order: 100,
    },
  ],
});
