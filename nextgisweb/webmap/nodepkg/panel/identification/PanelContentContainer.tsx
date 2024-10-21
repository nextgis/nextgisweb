import { Button } from "antd";
import classNames from "classnames";
import { useState } from "react";

import { DownOutlined, UpOutlined } from "@ant-design/icons";
import "./PanelContentContainer.less";

export function PanelContentContainer({
    fill,
    icon,
    title,
    content,
    children,
    control,
    noMarginX,
    marginAll,
    collapsible = false,
    defaultCollapsed = false,
}: {
    fill?: React.ReactNode;
    icon?: React.ReactNode;
    title?: React.ReactNode;
    control?: React.ReactNode;
    content?: React.ReactNode;
    children?: React.ReactNode;
    noMarginX?: boolean;
    marginAll?: boolean;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
}) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={"panel-content-container"}>
            {children ? (
                children
            ) : (
                <>
                    <div className="panel-header">
                        {(title || fill) && (
                            <div className="fill">
                                {title ? (
                                    <h3 className="panel-title">
                                        {icon && (
                                            <span className="panel-icon">
                                                {icon}
                                            </span>
                                        )}
                                        <span className="title-text">
                                            {title}
                                        </span>

                                        {control && (
                                            <div className="title-controls">
                                                {control}
                                            </div>
                                        )}

                                        {collapsible && (
                                            <Button
                                                type="text"
                                                icon={
                                                    isCollapsed ? (
                                                        <DownOutlined />
                                                    ) : (
                                                        <UpOutlined />
                                                    )
                                                }
                                                onClick={toggleCollapse}
                                                className={classNames(
                                                    "collapse-button"
                                                )}
                                            />
                                        )}
                                    </h3>
                                ) : (
                                    fill
                                )}
                            </div>
                        )}
                    </div>

                    {!isCollapsed && content && (
                        <div
                            className={classNames("content", {
                                "no-margin-x": noMarginX,
                                "margin-all": marginAll,
                            })}
                        >
                            {content}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
