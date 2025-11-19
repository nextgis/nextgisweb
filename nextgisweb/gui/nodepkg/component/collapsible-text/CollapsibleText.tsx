import { useState } from "react";

import "./CollapsibleText.less";
import { gettext } from "@nextgisweb/pyramid/i18n";

interface CollapsibleTextProps {
    text: string;
    maxChars?: number;
}

export function CollapsibleText({
    text,
    maxChars = 200,
}: CollapsibleTextProps) {
    const [expanded, setExpanded] = useState(false);

    if (!text) {
        return null;
    }

    const isLong = text.length > maxChars;

    if (!isLong) {
        return text;
    }

    const visibleText = expanded
        ? text
        : text.slice(0, maxChars).replace(/\s+$/g, "");

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(true);
    };

    const handleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(false);
    };

    return (
        <span className="cell-collapsible">
            <span>{visibleText}</span>
            {!expanded ? (
                <button
                    type="button"
                    className="cell-collapsible__more"
                    onClick={handleExpand}
                    title={text}
                >
                    ...
                </button>
            ) : (
                <button
                    type="button"
                    className="cell-collapsible__less"
                    onClick={handleCollapse}
                >
                    {gettext("collapse")}
                </button>
            )}
        </span>
    );
}
