import classNames from "classnames";

import type { PanelPlugin } from "@nextgisweb/webmap/panel";

interface DefaultMenuItemProps {
  item: PanelPlugin;
  active?: boolean;
  onClick?: () => void;
}

export function DefaultMenuItem({
  item,
  active,
  onClick,
}: DefaultMenuItemProps) {
  return (
    <div
      title={item.title}
      onClick={onClick}
      className={classNames("item", {
        active,
      })}
    >
      {item.icon}
    </div>
  );
}
