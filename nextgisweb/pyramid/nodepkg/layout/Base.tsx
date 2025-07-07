import classNames from "classnames";
import { observer } from "mobx-react-lite";
import React, { useEffect } from "react";

import { Modal, message } from "@nextgisweb/gui/antd";
import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import { EntrypointSuspense } from "../component/EntrypointSuspense";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { LayoutContext } from "./context/useLayoutContext";
import { Dynmenu } from "./dynmenu/Dynmenu";
import { Header } from "./header/Header";
import { layoutStore } from "./store";

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

const ShowModals = observer(() => {
    const { modalItems } = layoutStore;
    return modalItems.map(({ element, id }) => (
        <React.Fragment key={id}>{element}</React.Fragment>
    ));
});
ShowModals.displayName = "ShowModals";

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
    const [modalApi, modalContextHolder] = Modal.useModal();
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        layoutStore.setModalApi(modalApi);
        layoutStore.setMessageApi(messageApi);
    }, [modalApi, messageApi]);

    const renderBody = (
        <EntrypointSuspense entrypoint={entrypoint} props={entrypointProps} />
    );

    const PyramidLayout = () => (
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
                                    </h1>{" "}
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

    return (
        <>
            <title>{title}</title>
            <LayoutContext value={{ modal: modalApi, message: messageApi }}>
                {modalContextHolder}
                {contextHolder}
                <ShowModals />
                {layoutMode === "nullSpace" ? renderBody : <PyramidLayout />}
            </LayoutContext>
        </>
    );
}
