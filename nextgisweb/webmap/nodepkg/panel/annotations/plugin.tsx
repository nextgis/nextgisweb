/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import AnnotationIcon from "@nextgisweb/icon/material/chat";

const AnnotationsMapLazy = lazy(() => import("./AnnotationsMap"));

registry.register(COMP_ID, {
  type: "widget",
  widget: () => import("./AnnotationsPanel"),
  name: "annotation",
  title: gettext("Annotations"),
  icon: <AnnotationIcon />,
  order: 30,
  applyToTinyMap: true,

  tab: { forceRender: true },

  isEnabled: ({ config }: { config: DisplayConfig }) => {
    return (
      config.annotations &&
      config.annotations.enabled &&
      config.annotations.scope.read
    );
  },
  renderMap: AnnotationsMapLazy,
});
