import classNames from "classnames";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Outlet, useLocation, useMatches } from "react-router-dom";

import { Modal, Spin, useToken } from "@nextgisweb/gui/antd";
import { useShowModal } from "@nextgisweb/gui/show-modal/useShowModal";

import { CBlock } from "../cblock";
import { resolveControlPanelDynMenuItems } from "../control-panel/resolveControlPanelDynMenuItems";
import { useAbortController } from "../hook";

import { Breadcrumbs } from "./Breadcrumbs";
import type {
  PageModel,
  PageModelPatch,
  PageModelRouteHandle,
} from "./PageModel";
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

interface BaseLayoutProps {
  children?: ReactNode;
}

const PageModelContext = createContext<PageModel | undefined>(undefined);

export function PageModelProvider({
  value,
  children,
}: {
  value: PageModel;
  children: ReactNode;
}) {
  return (
    <PageModelContext.Provider value={value}>
      {children}
    </PageModelContext.Provider>
  );
}

function useInitialPageModel() {
  const value = useContext(PageModelContext);

  if (!value) {
    throw new Error("PageModelProvider is missing");
  }

  return value;
}

function mergePageModel(
  initialPageModel: PageModel,
  patch: PageModelPatch,
  preserveInitialEntryProps: boolean
): PageModel {
  return {
    ...initialPageModel,
    ...patch,
    entrypointProps: preserveInitialEntryProps
      ? { ...patch.entrypointProps, ...initialPageModel.entrypointProps }
      : patch.entrypointProps,
    breadcrumbs:
      patch.breadcrumbs ??
      (patch.dynMenuResourceId !== undefined &&
      initialPageModel.dynMenuResourceId !== patch.dynMenuResourceId
        ? []
        : initialPageModel.breadcrumbs),
    header: patch.header ?? initialPageModel.header,
    title: patch.title ?? initialPageModel.title,
  };
}

export function useCurrentPageModel() {
  const initialPageModel = useInitialPageModel();
  const matches = useMatches();
  const location = useLocation();
  const initialLocation = useRef(
    `${location.pathname}${location.search}${location.hash}`
  ).current;

  for (const match of [...matches].reverse()) {
    const handle = match.handle as PageModelRouteHandle | undefined;
    const pageModel = handle?.pageModel;

    if (pageModel) {
      const patch = pageModel({
        params: match.params,
        initialPageModel,
        location,
      });
      const currentLocation = `${location.pathname}${location.search}${location.hash}`;

      return mergePageModel(
        initialPageModel,
        patch,
        currentLocation === initialLocation &&
          patch.entrypoint === initialPageModel.entrypoint
      );
    }
  }

  return initialPageModel;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const model = useCurrentPageModel();

  const {
    title,
    header,
    hideMenu,
    maxwidth,
    maxheight,
    layoutMode = "content",
    breadcrumbs,
    dynMenuResourceId,
    hideResourceFilter = false,
  } = model;

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

  const renderBody = children ?? <Outlet />;

  const PyramidLayout = () => (
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
                  <div className="ngw-pyramid-layout-title">
                    <h1 id="title">{title}</h1>
                  </div>
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

  return (
    <>
      <title>{title}</title>

      {modalContextHolder}
      {modalHolder}
      {layoutMode === "nullSpace" ? renderBody : <PyramidLayout />}
    </>
  );
}
