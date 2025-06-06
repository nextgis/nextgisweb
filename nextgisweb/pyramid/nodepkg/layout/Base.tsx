import { Suspense, lazy, useMemo } from "react";

import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { Dynmenu } from "./dynmenu/Dynmenu";
import { Header } from "./header/Header";

interface BaseProps {
    title: string;
    maxwidth?: boolean;
    maxheight?: boolean;
    entrypoint: string;
    dynMenuItems: DynMenuItem[];
    breadcrumbs: BreadcrumbItem[];
    entrypointProps: Record<string, any>;
}

export function Base({
    entrypointProps,
    dynMenuItems,
    breadcrumbs,
    entrypoint,
    maxheight,
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
            <Header title={title} hideResourceFilter={true} hideMenu={true} />

            <div className="ngw-pyramid-layout-crow">
                <div className="ngw-pyramid-layout-mwrapper">
                    <div id="main" className="ngw-pyramid-layout-main">
                        {breadcrumbs.length > 0 && (
                            <>
                                <div
                                    id="breadcrumbs"
                                    className="ngw-pyramid-layout-breadcrumbs-stub"
                                />
                                <Breadcrumbs items={breadcrumbs} />
                            </>
                        )}

                        <h1 id="title" className="ngw-pyramid-layout-title">
                            {title}
                        </h1>

                        <div
                            id="content"
                            className="content"
                            style={{ width: "100%" }}
                        >
                            <Suspense fallback={null}>
                                <LazyBody {...entrypointProps} />
                            </Suspense>
                        </div>
                    </div>
                </div>

                {dynMenuItems.length > 0 && (
                    <div className="ngw-pyramid-layout-sidebar">
                        <Dynmenu items={dynMenuItems} />
                    </div>
                )}
            </div>
        </div>
    );
}
