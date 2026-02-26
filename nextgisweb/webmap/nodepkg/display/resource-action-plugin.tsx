/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import { FastResourceActionModal } from "@nextgisweb/resource/resource-section/children/component/FastResourceActionModal";
import {
    registerResourceAction,
    registerResourceActionGroup,
} from "@nextgisweb/resource/resource-section/registry";

import CloneWebmap from "../clone-webmap";

import ContentCopyIcon from "@nextgisweb/icon/material/content_copy";
import DisplayIcon from "@nextgisweb/webmap/icon/display";

declare module "@nextgisweb/resource/resource-section/registry" {
    interface ResourceActionGroupIdMap {
        webmap: true;
    }
}

registerResourceActionGroup({
    key: "webmap",
    label: gettext("Web map"),
    order: 100,
});

registerResourceAction(COMP_ID, {
    key: "display",
    label: gettext("Display"),
    group: "webmap",
    icon: <DisplayIcon />,
    order: 0,
    target: "_blank",
    important: true,
    attributes: [["resource.has_permission", "resource.read"]],
    condition: (it) =>
        it.get("resource.cls") === "webmap" &&
        !!it.get("resource.has_permission", "resource.read"),
    href: ({ id }) => route("webmap.display", id).url(),
});

registerResourceAction(COMP_ID, {
    key: "clone",
    label: gettext("Clone"),
    group: "webmap",
    icon: <ContentCopyIcon />,
    order: 10,
    target: "_blank",
    important: false,
    attributes: [
        ["resource.has_permission", "resource.read"],
        ["resource.parent"],
    ],

    fastAction: ({ showModal, setAttrItems, attributes, item }) => {
        const { destroy } = showModal(() => (
            <FastResourceActionModal
                width={"700px"}
                href={route("webmap.clone", item.id).url()}
            >
                <CloneWebmap
                    id={item.id}
                    afterClone={async (e) => {
                        destroy();
                        if (
                            e.item.parent.id === item.get("resource.parent")?.id
                        ) {
                            const newItem = await resourceAttrItem({
                                resource: e.item.id,
                                attributes,
                            });
                            setAttrItems?.((old) => [...old, newItem]);
                        }
                    }}
                />
            </FastResourceActionModal>
        ));
    },

    condition: (it) =>
        it.get("resource.cls") === "webmap" &&
        !!it.get("resource.has_permission", "resource.read"),
    href: ({ id }) => route("webmap.clone", id).url(),
});
