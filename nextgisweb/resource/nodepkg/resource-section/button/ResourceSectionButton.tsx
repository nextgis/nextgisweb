import classNames from "classnames";
import type { ReactNode } from "react";

import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { ContentCard } from "@nextgisweb/gui/component";

import "./ResourceSectionButton.less";

interface ResourceSectionButtonProps extends ButtonProps {
  label: ReactNode;
}

export function ResourceSectionButton({
  children,
  className,
  label,
  ...props
}: ResourceSectionButtonProps) {
  return (
    <ContentCard
      className={classNames("ngw-resource-section-button", className)}
    >
      {children}
      <Button {...props}>{label}</Button>
    </ContentCard>
  );
}
