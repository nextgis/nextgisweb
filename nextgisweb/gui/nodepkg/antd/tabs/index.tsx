import { Tabs as TabsBase } from "antd";

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
    if (parentHeight) {
        className = (className ? className.split(" ") : [])
            .concat("ant-tabs-parent-height")
            .join(" ");
    }

    return <TabsBase {...{ ...props, className }} />;
}
