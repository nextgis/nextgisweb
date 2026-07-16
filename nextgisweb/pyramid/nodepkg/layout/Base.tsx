import classNames from "classnames";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Modal, Spin, useToken } from "@nextgisweb/gui/antd";
import { useShowModal } from "@nextgisweb/gui/show-modal/useShowModal";

import { CBlock } from "../cblock";
import { EntrypointSuspense } from "../component/EntrypointSuspense";
import { resolveControlPanelDynMenuItems } from "../control-panel/resolveControlPanelDynMenuItems";
import { useAbortController } from "../hook";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { Attrmenu } from "./attrmenu/Attrmenu";
import { Dynmenu } from "./dynmenu/Dynmenu";
import type { DynMenuItem } from "./dynmenu/Dynmenu";
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
  entrypointProps: Record<string, unknown>;
  breadcrumbs: BreadcrumbItem[];
  dynMenuResourceId?: number;
  hideResourceFilter?: boolean;
}

export type PyramidLayoutMode = "headerOnly" | "main" | "content";

export interface PyramidLayoutProps {
  title: string;
  header: string;
  children: ReactNode;
  hideMenu?: boolean;
  maxwidth?: boolean;
  maxheight?: boolean;
  layoutMode?: PyramidLayoutMode;
  breadcrumbs?: BreadcrumbItem[];
  dynMenuItems?: DynMenuItem[];
  dynMenuResourceId?: number;
  hideResourceFilter?: boolean;
}

function PyramidLayout({
  title,
  header,
  children,
  hideMenu = false,
  maxwidth = false,
  maxheight = false,
  layoutMode = "content",
  breadcrumbs = [],
  dynMenuResourceId,
  dynMenuItems,
  hideResourceFilter = false,
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
        children
      ) : (
        <div className="ngw-pyramid-layout-crow">
          <div className="ngw-pyramid-layout-mwrapper">
            <div id="main" className="ngw-pyramid-layout-main">
              {layoutMode === "main" ? (
                children
              ) : (
                <>
                  {breadcrumbs.length > 0 && (
                    <Breadcrumbs items={breadcrumbs} />
                  )}
                  <div className="ngw-pyramid-layout-title">
                    <h1 id="title">{title}</h1>
                  </div>
                  <div
                    id="content"
                    className="content"
                    style={{ width: "100%" }}
                  >
                    {children}
                  </div>
                </>
              )}
            </div>
          </div>

          {dynMenuResourceId !== undefined ? (
            <div className="ngw-pyramid-layout-sidebar">
              <Attrmenu resourceId={dynMenuResourceId} />
            </div>
          ) : (
            dynMenuItems &&
            dynMenuItems.length > 0 && (
              <div className="ngw-pyramid-layout-sidebar">
                <Dynmenu items={dynMenuItems} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function Base({
  title,
  header,
  hideMenu,
  maxwidth,
  maxheight,
  layoutMode = "content",
  entrypoint,
  breadcrumbs,
  entrypointProps,
  dynMenuResourceId,
  hideResourceFilter = false,
}: BaseProps) {
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [dynMenuItems, setDynMenuItems] = useState<DynMenuItem[] | undefined>(
    undefined
  );

  const { makeSignal } = useAbortController();

  const { modalHolder } = useShowModal({
    modalStore: layoutStore.modalStore,
  });

  const { token } = useToken();

  useEffect(() => {
    let canceled = false;

    if (!dynMenuItems) {
      const currentHref = window.location.href;

      resolveControlPanelDynMenuItems(makeSignal()).then((items) => {
        if (canceled) {
          return;
        }

        const pageFromDynMenu = items.some(
          (p) => p.type === "link" && currentHref.includes(p.url)
        );

        if (pageFromDynMenu) {
          setDynMenuItems(items);
        }
      });
    }

    return () => {
      canceled = true;
    };
  }, [dynMenuItems, makeSignal]);

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
    <>
      <title>{title}</title>

      {modalContextHolder}
      {modalHolder}
      {layoutMode === "nullSpace" ? (
        renderBody
      ) : (
        <PyramidLayout
          title={title}
          header={header}
          hideMenu={hideMenu}
          maxwidth={maxwidth}
          maxheight={maxheight}
          layoutMode={layoutMode}
          breadcrumbs={breadcrumbs}
          dynMenuResourceId={dynMenuResourceId}
          dynMenuItems={dynMenuItems}
          hideResourceFilter={hideResourceFilter}
        >
          {renderBody}
        </PyramidLayout>
      )}
    </>
  );
}
