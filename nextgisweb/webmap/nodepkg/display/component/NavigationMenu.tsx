import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import type { PanelManager } from "../../panel/PanelManager";
import type { PanelPlugin } from "../../panel/registry";

import "./NavigationMenu.less";

export interface NavigationMenuProps {
  store: PanelManager;
  orientation?: "vertical" | "horizontal";
}

export const NavigationMenu = observer<NavigationMenuProps>(
  ({ store, orientation = "vertical" }) => {
    const onClickItem = useCallback(
      async (item: PanelPlugin) => {
        switch (item.type) {
          case "widget":
            if (store.activePanelName === item.name) {
              store.closePanel();
            } else {
              store.setActive(item.name, "menu");
            }
            break;

          case "link":
            window.open(
              item.href,
              item.target ?? "_blank",
              "noopener,noreferrer"
            );
            break;

          case "action":
            await item.action({
              display: store.display,
            });
            break;
        }
      },
      [store]
    );

    const active = store.activePanel;
    const items = store.items;

    const startItems = items.filter((item) => item.placement !== "end");
    const endItems = items.filter((item) => item.placement === "end");

    const renderItem = (item: PanelPlugin) => (
      <div
        key={item.name}
        title={item.title}
        onClick={() => void onClickItem(item)}
        className={classNames("item", {
          active: item.type === "widget" && item.name === active?.name,
        })}
      >
        {item.icon}
      </div>
    );

    return (
      <div
        className={classNames(
          "ngw-webmap-display-navigation-menu",
          orientation
        )}
      >
        <div className="group start">{startItems.map(renderItem)}</div>
        <div className="group end">{endItems.map(renderItem)}</div>
      </div>
    );
  }
);

NavigationMenu.displayName = "NavigationMenu";
