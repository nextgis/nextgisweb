import type { Location, Params } from "react-router-dom";

import type { BreadcrumbItem } from "./Breadcrumbs";

export interface PageModel {
  entrypoint: string;
  entrypointProps: Record<string, unknown>;

  title: string;
  header: string;
  breadcrumbs: BreadcrumbItem[];

  layoutMode?: "headerOnly" | "main" | "content" | "nullSpace";
  maxwidth?: boolean;
  maxheight?: boolean;
  dynMenuResourceId?: number;
  hideResourceFilter?: boolean;
  hideMenu?: boolean;
}

export type PageModelPatch = Partial<PageModel> & {
  entrypoint: string;
  entrypointProps: Record<string, unknown>;
};

export interface PageModelRouteContext {
  params: Params<string>;
  initialPageModel: PageModel;
  location: Location;
}

export interface PageModelRouteHandle {
  pageModel?: (context: PageModelRouteContext) => PageModelPatch;
}
