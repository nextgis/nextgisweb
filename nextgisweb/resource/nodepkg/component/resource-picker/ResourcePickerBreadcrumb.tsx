import { observer } from "mobx-react-lite";
import { useMemo, useRef } from "react";
import type { ReactElement } from "react";

import {
  Breadcrumb,
  Skeleton,
  Space,
  Tooltip,
  Typography,
} from "@nextgisweb/gui/antd";
import type {
  BreadcrumbItemProps,
  BreadcrumbProps,
} from "@nextgisweb/gui/antd";

import {
  breadcrumbMeasureClassNames,
  useBreadcrumbOverflow,
} from "./hook/useBreadcrumbOverflow";
import type { ResourcePickerAttr, ResourcePickerBreadcrumbProps } from "./type";

import HomeFilledIcon from "@nextgisweb/icon/material/home";

function HomeIcon() {
  return <HomeFilledIcon style={{ fontSize: "1.1rem" }} />;
}

type BreadcrumbItemMenuItems = NonNullable<
  BreadcrumbItemProps["menu"]
>["items"];
type BreadcrumbItems = NonNullable<BreadcrumbProps["items"]>;

const itemRender: BreadcrumbProps["itemRender"] = (item) => item.title;

export const ResourcePickerBreadcrumb = observer(
  ({ store }: ResourcePickerBreadcrumbProps) => {
    const { breadcrumbItems, loading, allowMoveInside } = store;
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const visibleCount = useBreadcrumbOverflow({
      items: breadcrumbItems,
      containerRef,
      measureRef,
    });

    const { breadcrumbs, measureItems } = useMemo(() => {
      const items: BreadcrumbItems = [];
      const measureItems: BreadcrumbItems = [];
      const onClick = (newLastResourceId: number) => {
        store.changeParentTo(newLastResourceId);
      };

      const createLabel = (
        resItem: ResourcePickerAttr,
        name?: string | ReactElement
      ) => {
        const displayName = name || resItem.get("resource.display_name");
        const Label = allowMoveInside ? Typography.Link : Typography.Text;
        return (
          <Label
            className="resource-breadcrumb-item"
            ellipsis
            title={resItem.get("resource.display_name")}
            onClick={allowMoveInside ? () => onClick(resItem.id) : undefined}
          >
            {displayName}
          </Label>
        );
      };

      const menuItems: BreadcrumbItemMenuItems = [];
      const packFirstItemsToMenu = breadcrumbItems.length > visibleCount + 1;

      const visibleItemsStartIndex = breadcrumbItems.length - visibleCount;

      if (packFirstItemsToMenu) {
        // Skip the first item (Home) and pack the rest into the menu
        const breadcrumbsForMenu = breadcrumbItems.slice(
          1,
          visibleItemsStartIndex
        );
        const moveToMenuItems = breadcrumbsForMenu.map((item) => {
          return {
            key: item.id,
            label: createLabel(item),
          };
        });
        menuItems.push(...moveToMenuItems);
      }

      for (let i = 0; i < breadcrumbItems.length; i++) {
        const parent = breadcrumbItems[i];
        let name: ReactElement | string | undefined;
        if (i === 0) {
          const displayName = parent.get("resource.display_name");

          name =
            breadcrumbItems.length > 1 ? (
              <Tooltip title={displayName}>
                <HomeIcon />
              </Tooltip>
            ) : (
              <>
                <HomeIcon /> {displayName}
              </>
            );
        }
        const item = {
          title: createLabel(parent, name),
          key: parent.id,
        };
        measureItems.push(item);
        if (i === 0 || i >= visibleItemsStartIndex) {
          items.push(item);
        }
        if (i === 0 && breadcrumbItems.length > 1) {
          measureItems.push({
            title: "...",
            key: "-1",
            menu: { items: [] },
          });
        }
        if (i === 0 && packFirstItemsToMenu) {
          items.push({
            title: "...",
            key: "-1",
            menu: { items: menuItems },
          });
        }
      }
      return { breadcrumbs: items, measureItems };
    }, [visibleCount, breadcrumbItems, allowMoveInside, store]);

    return (
      <div ref={containerRef}>
        <div
          className="resource-breadcrumb-measure"
          ref={measureRef}
          aria-hidden
          inert
        >
          <Breadcrumb
            items={measureItems}
            itemRender={itemRender}
            classNames={breadcrumbMeasureClassNames}
          />
        </div>
        {loading.setBreadcrumbItemsFor ? (
          <Space>
            <Skeleton.Button active size="small" shape="circle" />
            <Skeleton.Input active size="small" />
          </Space>
        ) : (
          <Breadcrumb items={breadcrumbs} itemRender={itemRender} />
        )}
      </div>
    );
  }
);

ResourcePickerBreadcrumb.displayName = "ResourcePickerBreadcrumb";
