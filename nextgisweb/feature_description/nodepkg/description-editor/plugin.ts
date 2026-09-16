/** @plugin */
import { lazy } from "react";

import { featureEditorRegistry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

const DescriptionEditorLazy = lazy(() => import("./DescriptionEditor"));

featureEditorRegistry(COMP_ID, {
  store: () => import("./DescriptionEditorStore"),
  provider: ({ store }) => [
    {
      widget: DescriptionEditorLazy,
      store,
      label: gettext("Description"),
      identity: "description",
      order: 20,
    },
  ],
});
