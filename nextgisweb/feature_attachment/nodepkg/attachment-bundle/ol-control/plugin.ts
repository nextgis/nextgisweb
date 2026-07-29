/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

const AttachmentBundleControlLazy = lazy(
  () => import("./AttachmentBundleControl")
);

mapControlRegistry(COMP_ID, {
  key: "ab",
  order: 150,
  position: { inside: "map-toolbar" },
  component: AttachmentBundleControlLazy,
  label: gettext("Attachments"),
  embeddedShowMode: "customize",
  props: { title: gettext("Attachments") },
});
