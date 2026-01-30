/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import DisplayIcon from "@nextgisweb/webmap/icon/display";

registerResourceAction(COMP_ID, {
    key: "display",
    label: gettext("Display"),
    icon: <DisplayIcon />,
    order: 30,
    target: "_blank",
    attributes: [["resource.has_permission", "resource.read"]],
    condition: ({ cls, it }) =>
        cls === "webmap" &&
        !!it.get("resource.has_permission", "resource.read"),
    href: ({ it }) => route("webmap.display", it.id).url(),
});
