/** @plugin */
import { lazy } from "react";

import showModal from "@nextgisweb/gui/showModal";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import PreviewIcon from "@nextgisweb/icon/material/preview";

const PreviewLayerModal = lazy(
  () => import("./preview-layer/PreviewLayerModal")
);

registerResourceAction(COMP_ID, {
  key: "preview",
  label: gettext("Preview"),
  icon: <PreviewIcon />,
  menu: { order: 50, group: "resource" },
  quick: { order: 40 },
  href: ({ id }) => route("layer_preview.map", id).url(),
  attributes: [
    ["resource.has_permission", "data.read"],
    ["layer_preview.available"],
  ],
  condition: (it) =>
    !!it.get("layer_preview.available") &&
    !!it.get("resource.has_permission", "data.read"),
  run: ({ item }) => {
    const id = item.id;
    const { destroy } = showModal(PreviewLayerModal, {
      resourceId: id,
      href: route("layer_preview.map", id).url(),
      open: true,
      onCancel: () => destroy(),
    });
  },
});
