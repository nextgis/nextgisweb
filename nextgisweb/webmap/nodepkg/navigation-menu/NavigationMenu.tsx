import { observer } from "mobx-react-lite";
import type { ReactElement } from "react";

import type { PanelDojoItem } from "../type";

import { navigationMenuStore } from "./NavigationMenuStore";

import "./NavigationMenu.less";

export interface NavigationMenuProps {
    panels: Map<string, PanelDojoItem>;
}

export const NavigationMenu = observer(({ panels }: NavigationMenuProps) => {
    const onClickItem = (item: PanelDojoItem) => {
        navigationMenuStore.setActive(item.name, "menu");
    };

    const menuItems: ReactElement[] = [];
    if (panels) {
        const activePanel = navigationMenuStore.activePanel;
        panels.forEach((p) => {
            const activeClass = p.name === activePanel ? "active" : "";
            menuItems.push(
                <div
                    key={p.name}
                    className={`navigation-menu__item ${activeClass}`}
                    title={p.title}
                    onClick={() => onClickItem(p)}
                >
                    <svg className="icon" fill="currentColor">
                        <use xlinkHref={`#icon-${p.menuIcon}`} />
                    </svg>
                </div>
            );
        });
    }

    return <div className="navigation-menu">{menuItems}</div>;
});
