import { observer } from "mobx-react-lite";
import { Suspense, lazy } from "react";
import type { ComponentType } from "react";

import type { BasePanelMeta } from "@nextgisweb/webmap/type";

import type { PanelPlugin } from "../../panels-manager/registry";
import type { PanelComponentProps } from "../../panels-manager/type";
import type { Display } from "../Display";

export const ActiveComponent = observer(
    ({
        activePanel,
        display,
    }: {
        activePanel?: PanelPlugin;
        display: Display;
    }) => {
        if (activePanel) {
            const { load, meta } = activePanel;
            const Loader = lazy<ComponentType<PanelComponentProps>>(() =>
                load().then((mod) => ({
                    default: mod,
                }))
            );

            const { closePanel } = display.panelsManager;
            const getKey = (m: BasePanelMeta) => m.name + m.key;
            const isVisible =
                display.panelsManager.activePanel &&
                getKey(display.panelsManager.activePanel.meta) === getKey(meta);
            return (
                <Suspense key={getKey(meta)}>
                    <Loader
                        display={display}
                        close={closePanel}
                        {...meta}
                        visible={isVisible}
                    />
                </Suspense>
            );
        }
    }
);
ActiveComponent.displayName = "ActiveComponent";
