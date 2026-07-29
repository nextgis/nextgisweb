/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { GEOMETRY_KEY } from "./constant";

const GeometryEditorLazy = lazy(() => import("./GeometryEditor"));

registry.register(COMP_ID, {
  widget: GeometryEditorLazy,
  store: () => import("./GeometryEditorStore"),
  label: gettext("Geometry"),
  identity: GEOMETRY_KEY,
  order: 100,
});
