import type { HTMLAttributeAnchorTarget } from "react";

import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";

export interface ResourceLinkProps {
  resourceId: number;
  target?: HTMLAttributeAnchorTarget;
}

export function ResourceLink({
  target = "_blank",
  resourceId,
}: ResourceLinkProps) {
  return (
    <a
      href={routeURL("resource.show", resourceId)}
      target={target}
      onMouseDown={(evt) => {
        // Prevent from opening picker
        evt.stopPropagation();
      }}
    >
      <OpenInNewIcon />
    </a>
  );
}
