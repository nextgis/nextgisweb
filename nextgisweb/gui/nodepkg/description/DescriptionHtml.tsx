import type { Ref } from "react";

import { ProcessedHtml } from "./ProcessHTML";

import "./DescriptionHtml.less";

type DescriptionHtml = {
    content: string;
    onLinkClick?: ((e: React.MouseEvent<HTMLAnchorElement>) => boolean) | null;
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
    return (
        <div
            ref={elementRef}
            className={`ngw-gui-component-description-html ngw-gui-component-description-html-${mode} ${className}`}
        >
            <ProcessedHtml htmlString={content} onLinkClick={onLinkClick} />
        </div>
    );
};

DescriptionHtml.displayName = "Description";

export { DescriptionHtml };
