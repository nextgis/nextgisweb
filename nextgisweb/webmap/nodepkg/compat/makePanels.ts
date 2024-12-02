import { publish } from "dojo/topic";

import { gettext } from "@nextgisweb/pyramid/i18n";
import AnnotationsStore from "@nextgisweb/webmap/store/annotations";

import MapStatesObserver from "../map-state-observer";
import type { VisibleMode } from "../store/annotations/AnnotationsStore";
import type { DojoDisplay } from "../type";
import reactPanel from "../ui/react-panel";

function buildAnnotationPanel({ display }: { display: DojoDisplay }) {
    const shouldMakePanel =
        display.config.annotations &&
        display.config.annotations.enabled &&
        display.config.annotations.scope.read;
    if (!shouldMakePanel) {
        return;
    }
    const annotUrlParam = display._urlParams.annot as VisibleMode;
    const allowedUrlValues: VisibleMode[] = ["no", "yes", "messages"];
    let initialAnnotVisible: VisibleMode | undefined = undefined;
    if (annotUrlParam && allowedUrlValues.includes(annotUrlParam)) {
        initialAnnotVisible = annotUrlParam;
    }
    initialAnnotVisible =
        initialAnnotVisible || display.config.annotations.default;
    AnnotationsStore.setVisibleMode(initialAnnotVisible);
    import("@nextgisweb/webmap/ui/annotations-manager/AnnotationsManager").then(
        ({ AnnotationsManager }) => {
            new AnnotationsManager({
                display,
                initialAnnotVisible,
            });
        }
    );
    display.panelsManager.addPanels({
        cls: reactPanel(() => import("@nextgisweb/webmap/panel/annotations/"), {
            props: {
                onTopicPublish: ([key, e]) => {
                    publish(key, e);
                },
                mapStates: MapStatesObserver.getInstance(),
                initialAnnotVisible,
            },
        }),
        params: {
            title: gettext("Annotations"),
            name: "annotation",
            order: 30,
            menuIcon: "material-chat",
            applyToTinyMap: true,
        },
    });
}

export function makePanels({ display }: { display: DojoDisplay }) {
    const { panelsManager } = display;

    panelsManager.addPanels({
        cls: reactPanel(() => import("@nextgisweb/webmap/panel/layers"), {
            waitFor: [panelsManager.panelsReady.promise],
        }),
        params: {
            title: gettext("Layers"),
            name: "layers",
            order: 10,
            menuIcon: "material-layers",
            applyToTinyMap: true,
        },
    });

    panelsManager.addPanels({
        cls: reactPanel(
            () => import("@nextgisweb/webmap/panel/identification")
        ),
        params: {
            title: gettext("Identify"),
            name: "identify",
            order: 15,
            menuIcon: "material-arrow_selector_tool",
            applyToTinyMap: true,
        },
    });

    panelsManager.addPanels({
        cls: reactPanel(() => import("@nextgisweb/webmap/panel/search")),
        params: {
            title: gettext("Search"),
            name: "search",
            order: 20,
            menuIcon: "material-search",
            applyToTinyMap: true,
        },
    });

    panelsManager.addPanels({
        cls: reactPanel(() => import("@nextgisweb/webmap/panel/print")),
        params: {
            title: gettext("Print map"),
            name: "print",
            order: 70,
            menuIcon: "material-print",
        },
    });

    if (display.config.bookmarkLayerId) {
        panelsManager.addPanels({
            cls: reactPanel(() => import("@nextgisweb/webmap/panel/bookmarks")),
            params: {
                title: gettext("Bookmarks"),
                name: "bookmark",
                order: 50,
                menuIcon: "material-bookmark",
                applyToTinyMap: true,
            },
        });
    }

    if (display.config.webmapDescription) {
        panelsManager.addPanels({
            cls: reactPanel(
                () => import("@nextgisweb/webmap/panel/description")
            ),
            params: {
                title: gettext("Description"),
                name: "info",
                order: 40,
                menuIcon: "material-info",
                applyToTinyMap: true,
            },
        });
    }

    buildAnnotationPanel({ display });

    panelsManager.addPanels({
        cls: reactPanel(() => import("@nextgisweb/webmap/panel/share")),
        params: {
            title: gettext("Share"),
            name: "share",
            order: 60,
            menuIcon: "material-share",
        },
    });

    panelsManager.initFinalize();
}
