import classNames from "classnames";

import "./Dynmenu.less";

export interface DynMenuLabel {
  type: "label";
  label: string;
}

export interface DynMenuLink {
  type: "link";
  label: string;
  url: string;
  target?: React.HTMLAttributeAnchorTarget;
  selected?: boolean;
  icon?: React.ReactElement;
}

export type DynMenuItem = DynMenuLabel | DynMenuLink;

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
                {item.icon}
                {item.label}
              </a>
            </li>
          );
        }

        return null;
      })}
    </ul>
  );
}
