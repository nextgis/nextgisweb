import type { Ref } from "react";

import { processHtml } from "./processHTML";

import "./DescriptionHtml.less";

type DescriptionHtml = {
    content: string;
    onLinkClick?: (() => void) | null;
    elementRef?: Ref<HTMLDivElement> | null;
    className?: string;
    mode?: "compact" | "default";
};

const DescriptionHtml = ({
    content,
    onLinkClick = null,
    elementRef = null,
    className = "",
    mode = "default",
}: DescriptionHtml) => {
    const processedContent = processHtml(content, onLinkClick);

    return (
        <div
            ref={elementRef}
            className={`ngw-gui-component-description-html ngw-gui-component-description-html-${mode} ${className}`}
        >
            {processedContent}
        </div>
    );
};

DescriptionHtml.displayName = "Description";

export { DescriptionHtml };
