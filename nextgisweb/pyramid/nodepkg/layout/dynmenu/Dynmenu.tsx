import classNames from "classnames";

import "./Dynmenu.less";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

interface DynmenuItemBse {
    type: string;
    label: string;
}

interface DynmenuLabelItem extends DynmenuItemBse {
    type: "label";
    label: string;
}

interface DynmenuLinkItem extends DynmenuItemBse {
    type: "link";
    label: string;
    url: string;
    target: string;
    icon?: string;
    icon_suffix?: string;
    selected?: boolean;
}

export type DynmenuItem = DynmenuLabelItem | DynmenuLinkItem;

export interface DynmenuProps {
    items: DynmenuItem[];
}

export function Dynmenu({ items }: DynmenuProps) {
    return (
        <ul className="ngw-pyramid-dynmenu">
            {items.map((item) => {
                if (item.type === "label") {
                    return (
                        <li className="label" key={item.label}>
                            {item.label}
                        </li>
                    );
                }

                if (item.type === "link") {
                    return (
                        <li
                            className={classNames("item", {
                                selected: item.selected,
                            })}
                            key={item.url}
                        >
                            <a href={item.url} target={item.target}>
                                {item.icon && (
                                    <SvgIcon
                                        icon={item.icon}
                                        fill="currentColor"
                                    />
                                )}
                                {item.label}
                                {item.icon_suffix && (
                                    <SvgIcon
                                        icon={item.icon_suffix}
                                        fill="currentColor"
                                        addClass="icon-s"
                                    />
                                )}
                            </a>
                        </li>
                    );
                }

                return null;
            })}
        </ul>
    );
}
