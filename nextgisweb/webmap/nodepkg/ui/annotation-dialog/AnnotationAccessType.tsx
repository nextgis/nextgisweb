import cn from "classnames";
import type { ReactNode } from "react";

import type { AccessType } from "@nextgisweb/webmap/layer/annotations/AnnotationFeature";

import "./AnnotationAccessType.css";

export function AnnotationAccessType({
  children,
  accessType,
}: {
  children: ReactNode;
  accessType?: AccessType;
}) {
  return (
    <div className={cn("annotation-access-type", accessType)}>{children}</div>
  );
}
