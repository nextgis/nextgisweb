import { useState } from "react";
import type { ComponentProps } from "react";

import { Tooltip, Typography } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgMore = gettext("More");
const msgLess = gettext("Less");

const { Paragraph } = Typography;

export interface ExpandableTextProps extends Omit<
  ComponentProps<typeof Paragraph>,
  "ellipsis" | "style" | "styles"
> {
  maxLines?: number;
  button?: boolean;
  tooltip?: boolean;
}

export function ExpandableText({
  maxLines = 3,
  button = undefined,
  tooltip = false,
  children,
  ...props
}: ExpandableTextProps) {
  const [hasEllipsis, setHasEllipsis] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <Tooltip
      styles={{ root: { maxWidth: "40em" } }}
      title={tooltip && hasEllipsis && !expanded ? children : undefined}
      mouseEnterDelay={1}
    >
      <Paragraph
        styles={{
          root: {
            margin: "unset",
            lineHeight: "unset",
            cursor: button === false && hasEllipsis ? "pointer" : undefined,
          },
          action: !button ? { display: "none" } : undefined,
        }}
        ellipsis={{
          rows: maxLines,
          expandable: "collapsible",
          symbol: button === true ? (val) => (val ? msgLess : msgMore) : <></>,
          expanded,
          onEllipsis: setHasEllipsis,
          onExpand: (e, info) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(info.expanded);
          },
        }}
        onClick={
          button === false && hasEllipsis
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }
            : undefined
        }
        {...props}
      >
        {children}
      </Paragraph>
    </Tooltip>
  );
}
