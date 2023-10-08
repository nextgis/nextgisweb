import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { Breadcrumb, Skeleton, Space, Tooltip } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";

import type { ResourceItem } from "../../type";

import type { ResourcePickerBreadcrumbProps } from "./type";

import HomeFilledIcon from "@nextgisweb/icon/material/home";

type BreadcrumbItems = NonNullable<ParamsOf<typeof Breadcrumb>["items"]>;

export const ResourcePickerBreadcrumb = observer(
    ({
        resourceStore,
        // TODO: make it dependent on the block length
        maxBreadcrumbItems = 2,
    }: ResourcePickerBreadcrumbProps) => {
        const { breadcrumbItems, breadcrumbItemsLoading, allowMoveInside } =
            resourceStore;

        const breadcrumbs = useMemo<BreadcrumbItems>(() => {
            const items: BreadcrumbItems = [];
            const onClick = (newLastResourceId: number) => {
                resourceStore.changeParentTo(newLastResourceId);
            };

            const createLabel = (
                resItem: ResourceItem,
                name?: string | ReactElement,
                link = true
            ) => {
                const displayName = name || resItem.resource.display_name;
                return (
                    <span className="resource-breadcrumb-item">
                        {allowMoveInside && link ? (
                            <a onClick={() => onClick(resItem.resource.id)}>
                                {displayName}
                            </a>
                        ) : (
                            displayName
                        )}
                    </span>
                );
            };

            const menuItems = [];
            const packFirstItemsToMenu =
                typeof maxBreadcrumbItems === "number" &&
                maxBreadcrumbItems !== Infinity &&
                breadcrumbItems.length > maxBreadcrumbItems + 1;

            if (packFirstItemsToMenu) {
                // Skip the first item because it's a Home
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
                const isLink = i < breadcrumbItems.length - 1;
                if (i === 0) {
                    if (breadcrumbItems.length > 1) {
                        name = (
                            <Tooltip title={parent.resource.display_name}>
                                <HomeIcon />
                            </Tooltip>
                        );
                    } else {
                        name = (
                            <Space>
                                <HomeIcon />
                                {parent.resource.display_name}
                            </Space>
                        );
                    }
                }
                const item: BreadcrumbItems[0] = {
                    title: createLabel(parent, name, isLink),
                    key: parent.resource.id,
                };
                items.push(item);
                if (i === 0 && packFirstItemsToMenu) {
                    if (packFirstItemsToMenu) {
                        items.push({
                            title: "...",
                            key: "-1",
                            menu: { items: menuItems },
                        });
                    }
                }
            }
            return items;
        }, [
            maxBreadcrumbItems,
            breadcrumbItems,
            allowMoveInside,
            resourceStore,
        ]);

        return breadcrumbItemsLoading ? (
            <Space>
                <Skeleton.Button active size="small" shape="circle" />
                <Skeleton.Input active size="small" />
            </Space>
        ) : (
            <Breadcrumb items={breadcrumbs} />
        );
    }
);
