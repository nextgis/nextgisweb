/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

const DescriptionEditorLazy = lazy(() => import("./DescriptionEditor"));

registry.register(COMP_ID, {
  widget: DescriptionEditorLazy,
  store: () => import("./DescriptionEditorStore"),
  label: gettext("Description"),
  identity: "description",
  order: 20,
});
