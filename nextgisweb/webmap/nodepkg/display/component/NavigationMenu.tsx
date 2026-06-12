import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { Suspense, useCallback } from "react";

import { message } from "@nextgisweb/gui/antd";
import { useShowModal } from "@nextgisweb/gui/index";

import type { PanelManager } from "../../panel/PanelManager";
import type {
  ActionButtonPanelPlugin,
  PanelPlugin,
} from "../../panel/registry";

import "./NavigationMenu.less";
import { DefaultMenuItem } from "./DefaultMenuItem";

export interface NavigationMenuProps {
  store: PanelManager;
  orientation?: "vertical" | "horizontal";
}

const ActionButtonItem = observer<{
  item: ActionButtonPanelPlugin;
  display: PanelManager["display"];
}>(({ item, display }) => {
  const Component = item.component;

  return (
    <Suspense fallback={<DefaultMenuItem item={item} />}>
      <Component display={display} plugin={item} className="item" />
    </Suspense>
  );
});

ActionButtonItem.displayName = "ActionButtonItem";

export const NavigationMenu = observer<NavigationMenuProps>(
  ({ store, orientation = "vertical" }) => {
    const { showModal, modalHolder } = useShowModal();
    const [messageApi, messageHolder] = message.useMessage();

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
              showModal,
              messageApi,
            });
            break;

          case "action-button":
            break;
        }
      },
      [messageApi, showModal, store]
    );

    const active = store.activePanel;
    const items = store.items;

    const startItems = items.filter((item) => item.placement !== "end");
    const endItems = items.filter((item) => item.placement === "end");

    const renderItem = (item: PanelPlugin) => {
      if (item.type === "action-button") {
        return (
          <ActionButtonItem
            key={item.name}
            item={item}
            display={store.display}
          />
        );
      }

      return (
        <DefaultMenuItem
          key={item.name}
          item={item}
          active={item.type === "widget" && item.name === active?.name}
          onClick={() => {
            onClickItem(item);
          }}
        />
      );
    };

    return (
      <>
        {modalHolder}
        {messageHolder}
        <div
          className={classNames(
            "ngw-webmap-display-navigation-menu",
            orientation
          )}
        >
          <div className="group start">{startItems.map(renderItem)}</div>
          <div className="group end">{endItems.map(renderItem)}</div>
        </div>
      </>
    );
  }
);

NavigationMenu.displayName = "NavigationMenu";
