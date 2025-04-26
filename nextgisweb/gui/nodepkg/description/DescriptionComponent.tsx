import type { Ref } from "react";

import "./description.css";
import { processHtml } from "./processHTML";

type DescriptionComponent = {
    content: string;
    onLinkClick?: (() => void) | null;
    elementRef?: Ref<HTMLDivElement> | null;
    className?: string;
};

const DescriptionComponent = ({
    content,
    onLinkClick = null,
    elementRef = null,
    className = "",
}: DescriptionComponent) => {
    const processedContent = processHtml(content, onLinkClick);

    return (
        <div ref={elementRef} className={`description-html ${className}`}>
            {processedContent}
        </div>
    );
};

DescriptionComponent.displayName = "Description";

export { DescriptionComponent };
