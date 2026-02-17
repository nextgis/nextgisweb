import classNames from "classnames";
import { useEffect } from "react";

import { Modal, Spin, useToken } from "@nextgisweb/gui/antd";
import { useShowModal } from "@nextgisweb/gui/show-modal/useShowModal";
import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import { CBlock } from "../cblock";
import { EntrypointSuspense } from "../component/EntrypointSuspense";
import { ErrorBoundary } from "../error-boundary/ErrorBoundary";
import ErrorPage from "../error-page";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { Dynmenu } from "./dynmenu/Dynmenu";
import { Header } from "./header/Header";
import { layoutStore } from "./store";

import { LoadingOutlined } from "@ant-design/icons";

Spin.setDefaultIndicator(<LoadingOutlined />);

declare module "@nextgisweb/pyramid/cblock" {
    interface CBlocks {
        // Banner at the top of the page above the header
        "pyramid.banner": undefined;
    }
}

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

interface PyramidLayoutProps extends Omit<
    BaseProps,
    "entrypointProps" | "entrypoint"
> {
    body: React.ReactNode;
}

function PyramidLayout({
    hideResourceFilter = false,
    dynMenuItems,
    breadcrumbs,
    layoutMode = "content",
    maxheight,
    hideMenu,
    maxwidth,
    header,
    title,
    body,
}: PyramidLayoutProps) {
    return (
        <div
            className={classNames("ngw-pyramid-layout", {
                "ngw-pyramid-layout-hstretch": maxwidth,
                "ngw-pyramid-layout-vstretch": maxheight,
            })}
        >
            <CBlock slot="pyramid.banner" />

            <Header
                header={header}
                hideResourceFilter={hideResourceFilter}
                hideMenu={hideMenu}
            />

            {layoutMode === "headerOnly" ? (
                body
            ) : (
                <div className="ngw-pyramid-layout-crow">
                    <div className="ngw-pyramid-layout-mwrapper">
                        <div id="main" className="ngw-pyramid-layout-main">
                            {layoutMode === "main" ? (
                                body
                            ) : (
                                <>
                                    {breadcrumbs.length > 0 && (
                                        <Breadcrumbs items={breadcrumbs} />
                                    )}
                                    <div className="ngw-pyramid-layout-title">
                                        <h1 id="title">{title}</h1>
                                    </div>{" "}
                                    <div
                                        id="content"
                                        className="content"
                                        style={{ width: "100%" }}
                                    >
                                        {body}
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

export function Base({
    entrypointProps,
    entrypoint,
    layoutMode = "content",
    title,
    ...rest
}: BaseProps) {
    const [modalApi, modalContextHolder] = Modal.useModal();

    const { modalHolder } = useShowModal({
        modalStore: layoutStore.modalStore,
    });

    const { token } = useToken();

    useEffect(() => {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "theme-color");
            document.head.appendChild(meta);
        }

        meta.setAttribute("content", token.colorPrimary);
    }, [token.colorBgBase, token.colorPrimary]);

    useEffect(() => {
        layoutStore.setModalApi(modalApi);
    }, [modalApi]);

    const renderBody = (
        <EntrypointSuspense entrypoint={entrypoint} props={entrypointProps} />
    );

    return (
        <ErrorBoundary
            fallback={(err) => (
                <PyramidLayout
                    layoutMode={layoutMode}
                    title={title}
                    body={<ErrorPage error_json={err} />}
                    {...rest}
                />
            )}
        >
            <title>{title}</title>

            {modalContextHolder}
            {modalHolder}
            {layoutMode === "nullSpace" ? (
                renderBody
            ) : (
                <PyramidLayout
                    layoutMode={layoutMode}
                    title={title}
                    body={renderBody}
                    {...rest}
                />
            )}
        </ErrorBoundary>
    );
}
