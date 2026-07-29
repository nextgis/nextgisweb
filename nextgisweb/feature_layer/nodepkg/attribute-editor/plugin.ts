/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ATTRIBUTES_KEY } from "../feature-editor/constant";

const AttributeEditorLazy = lazy(() => import("./AttributeEditor"));

registry.register(COMP_ID, {
  widget: AttributeEditorLazy,
  store: () => import("./AttributeEditorStore"),
  label: gettext("Attributes"),
  identity: ATTRIBUTES_KEY,
  order: 10,
});
