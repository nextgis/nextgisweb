/** @plugin */
import { lazy } from "react";

import { featureEditorRegistry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ATTRIBUTES_KEY } from "../feature-editor/constant";

const AttributeEditorLazy = lazy(() => import("./AttributeEditor"));

featureEditorRegistry(COMP_ID, {
  store: () => import("./AttributeEditorStore"),
  provider: ({ store }) => [
    {
      widget: AttributeEditorLazy,
      store,
      label: gettext("Attributes"),
      identity: ATTRIBUTES_KEY,
      order: 10,
    },
  ],
});
