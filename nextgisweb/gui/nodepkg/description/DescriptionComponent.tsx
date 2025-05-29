import type { Ref } from "react";

import { processHtml } from "./processHTML";

import "./DescriptionComponent.less";

type DescriptionComponent = {
    content: string;
    onLinkClick?: (() => void) | null;
    elementRef?: Ref<HTMLDivElement> | null;
    className?: string;
    mode?: "compact" | "default";
};

const DescriptionComponent = ({
    content,
    onLinkClick = null,
    elementRef = null,
    className = "",
    mode = "default",
}: DescriptionComponent) => {
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

DescriptionComponent.displayName = "Description";

export { DescriptionComponent };
