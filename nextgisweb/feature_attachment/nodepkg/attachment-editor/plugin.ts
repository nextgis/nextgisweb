/** @plugin */
import { lazy } from "react";

import { featureEditorRegistry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

const AttachmentEditorLazy = lazy(() => import("./AttachmentEditor"));

featureEditorRegistry(COMP_ID, {
  store: () => import("./AttachmentEditorStore"),
  provider: ({ store }) => [
    {
      widget: AttachmentEditorLazy,
      store,
      label: gettext("Attachments"),
      identity: "attachment",
      order: 30,
    },
  ],
});
