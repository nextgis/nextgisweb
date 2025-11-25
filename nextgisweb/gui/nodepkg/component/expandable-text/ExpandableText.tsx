import { useState } from "react";

import { Typography } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

const { Paragraph } = Typography;

interface CollapsibleTextProps {
    text: string;
    maxLines?: number;
}

export function ExpandableText({ text, maxLines = 3 }: CollapsibleTextProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Paragraph
            style={{ marginBottom: "unset" }}
            ellipsis={{
                rows: maxLines,
                expandable: "collapsible",
                symbol: (val) => (val ? gettext("Less") : gettext("More")),
                expanded,
                onExpand: (e, info) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpanded(info.expanded);
                },
            }}
        >
            {text}
        </Paragraph>
    );
}
