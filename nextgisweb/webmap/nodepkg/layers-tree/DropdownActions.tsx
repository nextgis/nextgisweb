import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";

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

interface DropdownPluginsProps {
    menuItems: MenuProps["items"];
    customMenuItems: React.ReactElement[];
    onOpenChange?: () => void;
}

const DropdownPlugins = observer(
    ({ customMenuItems, menuItems, onOpenChange }: DropdownPluginsProps) => {
        return (
            <Dropdown
                menu={{
                    items: menuItems,
                    onClick: ({ domEvent }) => {
                        domEvent.stopPropagation();
                    },
                }}
                onOpenChange={onOpenChange}
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
    const { nodeData, moreClickId, setMoreClickId, update, setUpdate } = props;
    const { id, type } = nodeData;
    const { display } = useDisplayContext();

    const [menuItems, setMenuItems] = useState<MenuProps["items"]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [customMenuItems, setCustomMenuItems] = useState<
        React.ReactElement[]
    >([]);

    const canceledRef = useRef(false);

    const isLoadingRef = useRef(false);

    useEffect(() => {
        canceledRef.current = false;
        return () => {
            canceledRef.current = true;
        };
    }, []);

    const startup = useCallback(async () => {
        if (!nodeData.isLayer() || isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            setIsLoading(true);
            const plugins = await display.installPlugins(
                Object.keys(nodeData.plugin)
            );
            if (canceledRef.current) return;

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
                                    const result = await plugin.run(nodeData);
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
            setMoreClickId(id);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, [display, id, nodeData, setMoreClickId, setUpdate, update]);

    if (type === "group") {
        return <></>;
    }

    if (moreClickId === undefined || moreClickId !== id) {
        return (
            <span
                className="more action-btn"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startup();
                }}
            >
                {isLoading ? <CentralLoading /> : <MoreVertIcon />}
            </span>
        );
    }

    return (
        <DropdownPlugins
            onOpenChange={() => {
                setMoreClickId(undefined);
            }}
            menuItems={menuItems}
            customMenuItems={customMenuItems}
        />
    );
}
