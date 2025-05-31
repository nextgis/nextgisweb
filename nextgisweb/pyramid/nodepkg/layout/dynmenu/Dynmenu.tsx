import classNames from "classnames";

import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import "./Dynmenu.less";

export interface DynmenuProps {
    items: DynMenuItem[];
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
                                        className="icon-s"
                                        icon={item.icon_suffix}
                                        fill="currentColor"
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
