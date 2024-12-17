/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import { createPanelRegistry } from "@nextgisweb/webmap/panels-manager/registry";
import AnnotationsStore from "@nextgisweb/webmap/store/annotations";
import type { VisibleMode } from "@nextgisweb/webmap/store/annotations/AnnotationsStore";

import AnnotationIcon from "@nextgisweb/icon/material/chat";

const msgTitle = gettext("Annotations");

createPanelRegistry(COMP_ID, () => import("./AnnotationsPanel"), {
    title: msgTitle,
    name: "annotation",
    order: 30,
    menuIcon: <AnnotationIcon />,
    applyToTinyMap: true,

    beforeCreate: (plugin) => {
        const display = plugin.meta?.display;
        if (display) {
            const annotUrlParam = plugin.meta?.display?._urlParams
                .annot as VisibleMode;
            const allowedUrlValues: VisibleMode[] = ["no", "yes", "messages"];
            let initialAnnotVisible: VisibleMode | undefined = undefined;
            if (annotUrlParam && allowedUrlValues.includes(annotUrlParam)) {
                initialAnnotVisible = annotUrlParam;
            }
            initialAnnotVisible =
                initialAnnotVisible || display.config.annotations.default;
            AnnotationsStore.setVisibleMode(initialAnnotVisible);
            import(
                "@nextgisweb/webmap/ui/annotations-manager/AnnotationsManager"
            ).then(({ AnnotationsManager }) => {
                new AnnotationsManager({
                    display,
                    initialAnnotVisible,
                });
            });

            plugin.updateMeta({
                onTopicPublish: ([key, e]) => {
                    topic.publish(key, e);
                },

                initialAnnotVisible,
            });
        }
    },

    isEnabled: (meta) => {
        const config = meta.display?.config;
        return (
            config &&
            config.annotations &&
            config.annotations.enabled &&
            config.annotations.scope.read
        );
    },
});
