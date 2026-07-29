/** @plugin */
import { lazy } from "react";

import { headerRegistry } from "@nextgisweb/pyramid/layout/header/registry";

const ResourceFilterLazy = lazy(
  () => import("@nextgisweb/resource/resources-filter")
);

headerRegistry(COMP_ID, {
  component: ResourceFilterLazy,
  props: {
    onChange: (_value, option) => {
      window.location.href = option.url;
    },
  },
  order: -100,
  menuItem: false,
  isEnabled: ({ hideResourceFilter }) => {
    return !hideResourceFilter;
  },
});
