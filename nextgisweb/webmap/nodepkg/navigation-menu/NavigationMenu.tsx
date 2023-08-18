import "./NavigationMenu.less";

import type { ReactElement } from "react";
import type { PanelDojoItem } from "../panels-manager/type";

export interface NavigationMenuProps {
    panels: Map<string, PanelDojoItem>;
    onClick?: (panel: PanelDojoItem) => void;
    active?: string;
}

export function NavigationMenu({ panels, onClick, active }: NavigationMenuProps) {
    const onClickItem = (item: PanelDojoItem) => {
        if (onClick) {
            onClick(item);
        }
    };

    const menuItems: ReactElement[] = [];
    if (panels) {
        panels.forEach((p) => {
            const activeClass = p.name === active ? "active" : "";
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
}