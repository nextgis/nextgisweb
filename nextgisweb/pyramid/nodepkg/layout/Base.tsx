import classNames from "classnames";
import { Suspense, lazy, useMemo } from "react";

import { Flex, Spin } from "@nextgisweb/gui/antd";
import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { Dynmenu } from "./dynmenu/Dynmenu";
import { Header } from "./header/Header";

import { LoadingOutlined } from "@ant-design/icons";

interface BaseProps {
    title: string;
    header: string;
    hideMenu?: boolean;
    maxwidth?: boolean;
    maxheight?: boolean;
    layoutMode?: "headerOnly" | "main" | "content" | "nullSpace";
    entrypoint: string;
    breadcrumbs: BreadcrumbItem[];
    dynMenuItems: DynMenuItem[];
    entrypointProps: Record<string, any>;
    hideResourceFilter?: boolean;
}

function EntrypointFallback() {
    return (
        <Flex style={{ padding: "4em 8em" }} vertical>
            <Spin size="large" indicator={<LoadingOutlined spin />} />
        </Flex>
    );
}

export function Base({
    hideResourceFilter = false,
    entrypointProps,
    dynMenuItems,
    breadcrumbs,
    entrypoint,
    layoutMode = "content",
    maxheight,
    hideMenu,
    maxwidth,
    header,
    title,
}: BaseProps) {
    const LazyBody = useMemo(() => {
        return lazy(() => window.ngwEntry(entrypoint));
    }, [entrypoint]);

    const renderBody = (
        <Suspense fallback={<EntrypointFallback />}>
            <LazyBody {...entrypointProps} />
        </Suspense>
    );

    if (layoutMode === "nullSpace") {
        return renderBody;
    }

    return (
        <div
            className={classNames("ngw-pyramid-layout", {
                "ngw-pyramid-layout-hstretch": maxwidth,
                "ngw-pyramid-layout-vstretch": maxheight,
            })}
        >
            <Header
                header={header}
                hideResourceFilter={hideResourceFilter}
                hideMenu={hideMenu}
            />

            {layoutMode === "headerOnly" ? (
                renderBody
            ) : (
                <div className="ngw-pyramid-layout-crow">
                    <div className="ngw-pyramid-layout-mwrapper">
                        <div id="main" className="ngw-pyramid-layout-main">
                            {layoutMode === "main" ? (
                                renderBody
                            ) : (
                                <>
                                    {breadcrumbs.length > 0 && (
                                        <Breadcrumbs items={breadcrumbs} />
                                    )}

                                    <h1
                                        id="title"
                                        className="ngw-pyramid-layout-title"
                                    >
                                        {title}
                                    </h1>

                                    <div
                                        id="content"
                                        className="content"
                                        style={{ width: "100%" }}
                                    >
                                        {renderBody}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {dynMenuItems && dynMenuItems.length > 0 && (
                        <div className="ngw-pyramid-layout-sidebar">
                            <Dynmenu items={dynMenuItems} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
