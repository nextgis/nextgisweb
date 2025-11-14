import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Divider, Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { CentralLoading } from "@nextgisweb/gui/component";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import { useDisplayContext } from "../display/context";
import type { TreeItemStore } from "../store/tree-store/TreeItemStore";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";

import "./DropdownActions.less";

interface DropdownActionsProps {
    nodeData: TreeItemStore;
    moreClickId?: number;
    setMoreClickId: (id: number | undefined) => void;
    update: boolean;
    setUpdate: (update: boolean) => void;
}

const DropdownPlugins = observer(
    ({ update, nodeData, setMoreClickId, setUpdate }: DropdownActionsProps) => {
        const { display } = useDisplayContext();
        const [menuItems, setMenuItems] = useState<MenuProps["items"]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [customMenuItems, setCustomMenuItems] = useState<
            React.ReactElement[]
        >([]);

        useEffect(() => {
            let canceled = false;
            const startup = async () => {
                if (nodeData.isLayer()) {
                    try {
                        const plugins = await display.installPlugins(
                            Object.keys(nodeData.plugin)
                        );
                        if (canceled) return;

                        const newMenuItems: MenuProps["items"] = [];
                        const newCustomMenuItems: React.ReactElement[] = [];

                        for (const keyPlugin in plugins) {
                            const plugin = plugins[keyPlugin];
                            if (!plugin || !plugin.getPluginState) {
                                continue;
                            }
                            const { render } = plugin;
                            const pluginInfo = plugin.getPluginState(nodeData);
                            if (pluginInfo.enabled) {
                                if (plugin.getMenuItem) {
                                    const { icon, title, onClick } =
                                        plugin.getMenuItem(nodeData);
                                    const onClick_ = async () => {
                                        if (plugin) {
                                            if (onClick) {
                                                onClick();
                                            } else if (plugin.run) {
                                                const result =
                                                    await plugin.run(nodeData);
                                                if (result !== undefined) {
                                                    setUpdate(!update);
                                                }
                                            }
                                        }
                                        setMoreClickId(undefined);
                                    };

                                    newMenuItems.push({
                                        key: keyPlugin,
                                        onClick: onClick_,
                                        icon:
                                            typeof icon === "string" ? (
                                                <SvgIcon
                                                    className="icon"
                                                    icon={icon}
                                                    fill="currentColor"
                                                />
                                            ) : (
                                                icon
                                            ),
                                        label: title,
                                    });
                                } else if (render) {
                                    const RenderedPlugin = () =>
                                        render.call(plugin, pluginInfo);
                                    newCustomMenuItems.push(
                                        <RenderedPlugin key={keyPlugin} />
                                    );
                                }
                            }
                        }

                        setMenuItems(newMenuItems);
                        setCustomMenuItems(newCustomMenuItems);
                    } finally {
                        setIsLoading(false);
                    }
                }
            };

            startup();

            return () => {
                canceled = true;
            };
        }, [update, display, nodeData, setMoreClickId, setUpdate]);

        return (
            <Dropdown
                menu={{
                    items: menuItems,
                    onClick: ({ domEvent }) => {
                        domEvent.stopPropagation();
                    },
                }}
                onOpenChange={() => {
                    setMoreClickId(undefined);
                }}
                trigger={["click"]}
                destroyOnHidden
                open
                placement="bottomRight"
                popupRender={(menu) => (
                    <div
                        className="dropdown-content"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {isLoading ? (
                            <CentralLoading
                                style={{ width: "36px", height: "36px" }}
                            />
                        ) : (
                            <>
                                {menu}
                                {!!customMenuItems.length && (
                                    <>
                                        <Divider style={{ margin: 0 }} />
                                        <div className="ant-dropdown-menu">
                                            {customMenuItems}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            >
                <span
                    className="more"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    <MoreVertIcon />
                </span>
            </Dropdown>
        );
    }
);

DropdownPlugins.displayName = "DropdownPlugins";

export function DropdownActions(props: DropdownActionsProps) {
    const { nodeData, moreClickId, setMoreClickId } = props;
    const { id, type } = nodeData;
    if (type === "group") {
        return <></>;
    }
    if (moreClickId === undefined || moreClickId !== id) {
        return (
            <span
                className="more"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMoreClickId(id);
                }}
            >
                <MoreVertIcon />
            </span>
        );
    }
    return <DropdownPlugins {...props} />;
}
