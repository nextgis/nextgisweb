/** @testentry react */
import { useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { ResourceSelect } from "@nextgisweb/resource/component/resource-select";

import { useRouteGet } from "./useRouteGet";

export const UseRouterGetTest = () => {
    const [resourceId, setResourceId] = useState<number>(0);
    const { data } = useRouteGet({
        name: "resource.item",
        params: { id: resourceId },
    });
    return (
        <Space direction="vertical">
            <ResourceSelect
                value={resourceId}
                onChange={(e) => {
                    if (e) {
                        setResourceId(Array.isArray(e) ? e[0] : e);
                    }
                }}
            />
            <div>{data ? JSON.stringify(data, null, 2) : ""}</div>
        </Space>
    );
};

export default UseRouterGetTest;
