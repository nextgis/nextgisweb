/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import { registry } from "@nextgisweb/webmap/panel/registry";
import type { AnnotationVisibleMode } from "@nextgisweb/webmap/store/annotations/AnnotationsStore";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import AnnotationIcon from "@nextgisweb/icon/material/chat";

registry.register(COMP_ID, {
    widget: () => import("./AnnotationsPanel"),
    name: "annotation",
    title: gettext("Annotations"),
    icon: <AnnotationIcon />,
    order: 30,
    applyToTinyMap: true,

    tab: { forceRender: true },

    isEnabled: ({ config }: { config: DisplayConfig }) => {
        return (
            config.annotations &&
            config.annotations.enabled &&
            config.annotations.scope.read
        );
    },

    startup: async (display: Display) => {
        const { config, urlParams } = display;
        const annotUrlParam = urlParams.annot as AnnotationVisibleMode;
        const allowedUrlValues: AnnotationVisibleMode[] = [
            "no",
            "yes",
            "messages",
        ];

        let initialAnnotVisible: AnnotationVisibleMode | undefined = undefined;
        if (annotUrlParam && allowedUrlValues.includes(annotUrlParam)) {
            initialAnnotVisible = annotUrlParam;
        }
        initialAnnotVisible = initialAnnotVisible || config.annotations.default;

        const { default: annotationStore } =
            await import("@nextgisweb/webmap/store/annotations");
        annotationStore.setVisibleMode(initialAnnotVisible);

        const { AnnotationsManager } =
            await import("@nextgisweb/webmap/ui/annotations-manager/AnnotationsManager");

        new AnnotationsManager({ display, initialAnnotVisible });
    },
});
