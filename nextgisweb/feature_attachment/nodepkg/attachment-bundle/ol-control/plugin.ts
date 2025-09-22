/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

mapControlRegistry(COMP_ID, {
    key: "ab",
    order: 150,
    position: { inside: "map-toolbar" },
    component: () => import("./AttachmentBundleControl"),
    label: gettext("Attachments"),
    embeddedShowMode: "customize",
    props: { title: gettext("Attachments") },
});
