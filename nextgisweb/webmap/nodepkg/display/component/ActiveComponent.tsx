import { observer } from "mobx-react-lite";
import { Suspense, lazy } from "react";
import type { ComponentType } from "react";

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

            return (
                <Suspense key={meta.name + meta.key}>
                    <Loader
                        display={display}
                        close={() => {
                            display.panelsManager.closePanel();
                        }}
                        {...meta}
                    />
                </Suspense>
            );
        }
    }
);
ActiveComponent.displayName = "ActiveComponent";
