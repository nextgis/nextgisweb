import type { HTMLProps } from "react";

import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";

export interface ResourceLinkProps extends HTMLProps<HTMLAnchorElement> {
  resourceId: number;
}

export function ResourceLink({ resourceId, ...props }: ResourceLinkProps) {
  return (
    <a
      href={routeURL("resource.show", resourceId)}
      onMouseDown={(evt) => {
        // Prevent from opening picker
        evt.stopPropagation();
      }}
      {...props}
    >
      <OpenInNewIcon />
    </a>
  );
}
