import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import type { PanelsManager } from "../../panels-manager/PanelsManager";

import "./NavigationMenu.less";

export const NavigationMenu = observer(
    ({ store }: { store: PanelsManager }) => {
        const onClickItem = useCallback(
            (name: string) => {
                if (store.activePanelName === name) {
                    store.closePanel();
                } else {
                    store.setActive(name, "menu");
                }
            },
            [store]
        );

        const active = store.activePanel;
        return (
            <div className="ngw-webmap-display-navigation-menu">
                {store.sorted().map(({ name, title, plugin }) => (
                    <div
                        key={name}
                        title={title}
                        onClick={() => onClickItem(name)}
                        className={classNames(
                            "ngw-webmap-display-navigation-menu-item",
                            { "active": name === active?.name }
                        )}
                    >
                        {plugin.icon}
                    </div>
                ))}
            </div>
        );
    }
);

NavigationMenu.displayName = "NavigationMenu";
