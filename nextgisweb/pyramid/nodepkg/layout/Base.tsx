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
    hideMenu?: boolean;
    maxwidth?: boolean;
    maxheight?: boolean;
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
    maxheight,
    hideMenu,
    maxwidth,
    title,
}: BaseProps) {
    const layoutClasses = [
        "ngw-pyramid-layout",
        maxwidth && "ngw-pyramid-layout-hstretch",
        maxheight && "ngw-pyramid-layout-vstretch",
    ]
        .filter(Boolean)
        .join(" ");

    const LazyBody = useMemo(() => {
        return lazy(() => window.ngwEntry(entrypoint));
    }, [entrypoint]);

    return (
        <div className={layoutClasses}>
            <Header
                title={title}
                hideResourceFilter={hideResourceFilter}
                hideMenu={hideMenu}
            />
            <div className="ngw-pyramid-layout-crow">
                <div className="ngw-pyramid-layout-mwrapper">
                    <div id="main" className="ngw-pyramid-layout-main">
                        {breadcrumbs.length > 0 && (
                            <Breadcrumbs items={breadcrumbs} />
                        )}

                        <h1 id="title" className="ngw-pyramid-layout-title">
                            {title}
                        </h1>

                        <div
                            id="content"
                            className="content"
                            style={{ width: "100%" }}
                        >
                            <Suspense fallback={<EntrypointFallback />}>
                                <LazyBody {...entrypointProps} />
                            </Suspense>
                        </div>
                    </div>
                </div>

                {dynMenuItems && dynMenuItems.length > 0 && (
                    <div className="ngw-pyramid-layout-sidebar">
                        <Dynmenu items={dynMenuItems} />
                    </div>
                )}
            </div>
        </div>
    );
}
