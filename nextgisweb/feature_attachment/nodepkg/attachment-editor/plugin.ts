/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

const AttachmentEditorLazy = lazy(() => import("./AttachmentEditor"));

registry.register(COMP_ID, {
  widget: AttachmentEditorLazy,
  store: () => import("./AttachmentEditorStore"),
  label: gettext("Attachments"),
  identity: "attachment",
  order: 30,
});
