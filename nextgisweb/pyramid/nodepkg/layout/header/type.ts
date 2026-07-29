import type { FC, LazyExoticComponent } from "react";

import type { MenuItem } from "../store";

export type HeaderComponent<P = any> = LazyExoticComponent<FC<P>> | MenuItem;

export function isMenuItem<P>(item: HeaderComponent<P>): item is MenuItem {
  return typeof item === "object" && "title" in item;
}
