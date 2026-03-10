/** @plugin */
import { lazy } from "react";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import { ResourceActionModal } from "@nextgisweb/resource/component/ResourceActionModal";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import ContentCopyIcon from "@nextgisweb/icon/material/content_copy";
import DisplayIcon from "@nextgisweb/webmap/icon/display";

const CloneWebmapLazy = lazy(() => import("./clone-webmap"));

registerResourceAction(COMP_ID, {
  key: "display",
  label: gettext("Display"),
  menu: { group: "resource", order: 20 },
  icon: <DisplayIcon />,
  target: "_blank",
  quick: { order: 20 },
  attributes: [["resource.has_permission", "resource.read"]],
  condition: (it) =>
    it.get("resource.cls") === "webmap" &&
    !!it.get("resource.has_permission", "resource.read"),
  href: ({ id }) => route("webmap.display", id).url(),
});

registerResourceAction(COMP_ID, {
  key: "clone",
  label: gettext("Clone"),
  icon: <ContentCopyIcon />,
  menu: { order: 60, group: "resource" },
  target: "_blank",
  attributes: [
    ["resource.has_permission", "resource.read"],
    ["resource.parent"],
  ],

  run: ({ showModal, setAttrItems, attributes, item }) => {
    const { destroy } = showModal(() => (
      <ResourceActionModal
        width={"700px"}
        title={gettext("Clone web map")}
        href={route("webmap.clone", item.id).url()}
      >
        <CloneWebmapLazy
          id={item.id}
          afterClone={async (e) => {
            destroy();
            if (e.item.parent.id === item.get("resource.parent")?.id) {
              const newItem = await resourceAttrItem({
                resource: e.item.id,
                attributes,
              });
              setAttrItems?.((old) => [...old, newItem]);
            }
          }}
        />
      </ResourceActionModal>
    ));
  },

  condition: (it) =>
    it.get("resource.cls") === "webmap" &&
    !!it.get("resource.has_permission", "resource.read"),
  href: ({ id }) => route("webmap.clone", id).url(),
});
