import { Suspense } from "react";

import { Flex, Spin } from "@nextgisweb/gui/antd";

import { EntrypointLoader } from "../component/EntrypointLoader";

import { LoadingOutlined } from "@ant-design/icons";

function EntrypointFallback() {
    return (
        <Flex style={{ padding: "4em 8em" }} vertical>
            <Spin size="large" indicator={<LoadingOutlined spin />} />
        </Flex>
    );
}

export function EntrypointSuspense({
    entrypoint,
    props,
}: {
    entrypoint: string;
    props: Record<string, any>;
}) {
    return (
        <Suspense fallback={<EntrypointFallback />}>
            <EntrypointLoader entrypoint={entrypoint} props={props} />
        </Suspense>
    );
}
