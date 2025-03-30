import { Tabs as TabsBase } from "antd";
import classNames from "classnames";

import "./index.less";

type TabsBaseProps = Parameters<typeof TabsBase>[0];

export interface TabsProps extends TabsBaseProps {
    parentHeight?: boolean;
}

export default function Tabs({
    className,
    parentHeight = false,
    ...props
}: TabsProps) {
    className = classNames(className, {
        "ant-tabs-parent-height": parentHeight,
    });

    return <TabsBase className={className} {...props} />;
}
