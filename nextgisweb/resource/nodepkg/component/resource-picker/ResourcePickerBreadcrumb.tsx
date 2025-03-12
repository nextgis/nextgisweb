import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import type { ReactElement } from "react";

import cn from "classnames";

import { Breadcrumb, Skeleton, Space, Tooltip } from "@nextgisweb/gui/antd";
import type {
    BreadcrumbItemProps,
    BreadcrumbProps,
} from "@nextgisweb/gui/antd";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { ResourcePickerBreadcrumbProps } from "./type";

import HomeFilledIcon from "@nextgisweb/icon/material/home";

type BreadcrumbItemMenuItems = NonNullable<
    BreadcrumbItemProps["menu"]
>["items"];
type BreadcrumbItems = BreadcrumbProps["items"];

export const ResourcePickerBreadcrumb = observer(
    ({
        store,
        // TODO: make it dependent on the block length
        maxBreadcrumbItems = 2,
    }: ResourcePickerBreadcrumbProps) => {
        const { breadcrumbItems, loading, allowMoveInside } = store;

        const breadcrumbs = useMemo<BreadcrumbItems>(() => {
            const items: BreadcrumbItems = [];
            const onClick = (newLastResourceId: number) => {
                store.changeParentTo(newLastResourceId);
            };

            const createLabel = (
                resItem: CompositeRead,
                name?: string | ReactElement,
                isActive = false
            ) => {
                const displayName = name || resItem.resource.display_name;
                return (
                    <span className="resource-breadcrumb-item">
                        {allowMoveInside ? (
                            <a
                                onClick={() => onClick(resItem.resource.id)}
                                className={cn({ "active": isActive })}
                            >
                                {displayName}
                            </a>
                        ) : (
                            displayName
                        )}
                    </span>
                );
            };

            const menuItems: BreadcrumbItemMenuItems = [];
            const packFirstItemsToMenu =
                typeof maxBreadcrumbItems === "number" &&
                maxBreadcrumbItems !== Infinity &&
                breadcrumbItems.length > maxBreadcrumbItems + 1;

            if (packFirstItemsToMenu) {
                // Skip the first item (Home) and pack the rest into the menu
                const breadcrumbsForMenu = breadcrumbItems.splice(
                    1,
                    breadcrumbItems.length - 1 - maxBreadcrumbItems
                );
                const moveToMenuItems = breadcrumbsForMenu.map((item) => {
                    return {
                        key: item.resource.id,
                        label: createLabel(item),
                    };
                });
                menuItems.push(...moveToMenuItems);
            }

            const HomeIcon = () => (
                <HomeFilledIcon style={{ fontSize: "1.1rem" }} />
            );

            for (let i = 0; i < breadcrumbItems.length; i++) {
                const parent = breadcrumbItems[i];
                let name: ReactElement | string | undefined;
                const isActive = i >= breadcrumbItems.length - 1;
                if (i === 0) {
                    name =
                        breadcrumbItems.length > 1 ? (
                            <Tooltip title={parent.resource.display_name}>
                                <HomeIcon />
                            </Tooltip>
                        ) : (
                            <Space>
                                <HomeIcon />
                                {parent.resource.display_name}
                            </Space>
                        );
                }
                items.push({
                    title: createLabel(parent, name, isActive),
                    key: parent.resource.id,
                });
                if (i === 0 && packFirstItemsToMenu) {
                    items.push({
                        title: "...",
                        key: "-1",
                        menu: { items: menuItems },
                    });
                }
            }
            return items;
        }, [maxBreadcrumbItems, breadcrumbItems, allowMoveInside, store]);

        return loading.setBreadcrumbItemsFor ? (
            <Space>
                <Skeleton.Button active size="small" shape="circle" />
                <Skeleton.Input active size="small" />
            </Space>
        ) : (
            <Breadcrumb items={breadcrumbs} />
        );
    }
);

ResourcePickerBreadcrumb.displayName = "ResourcePickerBreadcrumb";
