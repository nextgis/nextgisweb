import { observer } from "mobx-react-lite";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type PanelsManager from "../panels-manager";
import type { PanelPlugin } from "../panels-manager/registry";
import "./NavigationMenu.less";

export interface NavigationMenuProps {
    panels: Map<string, PanelPlugin>;
}

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

        const menuItems = useMemo(() => {
            const menu: ReactElement[] = [];
            if (store.panels) {
                const activePanel = store.activePanel;
                store.panels.forEach(({ meta }) => {
                    const enabled = meta.enabled ?? true;

                    if (enabled) {
                        const activeClass =
                            meta.name === activePanel?.name ? "active" : "";
                        menu.push(
                            <div
                                key={meta.name}
                                className={`navigation-menu__item ${activeClass}`}
                                title={meta.title}
                                onClick={() => onClickItem(meta.name)}
                            >
                                {typeof meta.menuIcon === "string" ? (
                                    <svg className="icon" fill="currentColor">
                                        <use
                                            xlinkHref={`#icon-${meta.menuIcon}`}
                                        />
                                    </svg>
                                ) : (
                                    meta.menuIcon
                                )}
                            </div>
                        );
                    }
                });
            }
            return menu;
        }, [onClickItem, store.activePanel, store.panels]);

        return <div className="navigation-menu">{menuItems}</div>;
    }
);

NavigationMenu.displayName = "NavigationMenu";
