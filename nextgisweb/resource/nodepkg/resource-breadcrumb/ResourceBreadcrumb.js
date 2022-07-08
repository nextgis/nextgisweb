import HomeFilled from "@material-icons/svg/home-filled";
import { Breadcrumb, Menu, Skeleton, Space, Tooltip } from "@nextgisweb/gui/antd";
import { observer } from "mobx-react-lite";
import { PropTypes } from "prop-types";
import { useMemo } from "react";

export const ResourceBreadcrumb = observer(
    ({
        resourceStore,
        // TODO: make it dependent on the block length
        maxBreadcrumbItems = 2,
    }) => {
        const { brearcrumbItems, brearcrumbItemsLoading, allowMoveInside } =
            resourceStore;

        const breadcrumbItems = useMemo(() => {
            const items = [];
            const onClick = (newLastResourceId) => {
                resourceStore.changeParentTo(newLastResourceId);
            };

            const createLabel = (resItem, name, link = true) => {
                const name_ = name || resItem.resource.display_name;
                return (
                    <span className="resource-breadcrumb-item">
                        {allowMoveInside && link ? (
                            <a onClick={() => onClick(resItem.resource.id)}>
                                {name_}
                            </a>
                        ) : (
                            name_
                        )}
                    </span>
                );
            };

            const menuItems = [];
            const packFirstItemsToMenu =
                typeof maxBreadcrumbItems === "number" &&
                maxBreadcrumbItems !== Infinity &&
                brearcrumbItems.length > maxBreadcrumbItems;
            if (packFirstItemsToMenu) {
                // Skip the first item because it's a Home
                const breadcrumbsForMenu = brearcrumbItems.splice(
                    1,
                    brearcrumbItems.length - 1 - maxBreadcrumbItems
                );
                const moveToMenuItems = breadcrumbsForMenu.map((item) => {
                    return {
                        label: createLabel(item),
                    };
                });
                menuItems.push(...moveToMenuItems);
            }

            const moveToResourceMenu = menuItems.length && (
                <Menu items={menuItems} />
            );

            const HomeIcon = () => (
                <HomeFilled style={{ fontSize: "1.1rem" }} />
            );

            for (let i = 0; i < brearcrumbItems.length; i++) {
                const parent = brearcrumbItems[i];
                let name = null;
                const isLink = i < brearcrumbItems.length - 1;
                if (i === 0) {
                    name =
                        brearcrumbItems.length > 1 ? (
                            <Tooltip title={name}>
                                <HomeIcon />
                            </Tooltip>
                        ) : (
                            <Space>
                                <HomeIcon />
                                {parent.resource.display_name}
                            </Space>
                        );
                }
                const item = (
                    <Breadcrumb.Item
                        key={parent.resource.id}
                        overlay={i === 0 && moveToResourceMenu}
                    >
                        {createLabel(parent, name, isLink)}
                    </Breadcrumb.Item>
                );
                items.push(item);
            }
            return items;
        }, [brearcrumbItems, allowMoveInside]);

        return brearcrumbItemsLoading ? (
            <Space>
                <Skeleton.Button active size="small" shape="circle" />
                <Skeleton.Input active size="small" />
            </Space>
        ) : (
            <Breadcrumb>{breadcrumbItems}</Breadcrumb>
        );
    }
);

ResourceBreadcrumb.propTypes = {
    resourceStore: PropTypes.object,
    maxBreadcrumbItems: PropTypes.number,
};
