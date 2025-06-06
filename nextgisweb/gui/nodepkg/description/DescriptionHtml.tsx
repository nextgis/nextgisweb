import type { FC, Ref } from "react";

import { ProcessedHtml } from "./ProcessedHtml";

import "./DescriptionHtml.less";

interface DescriptionHtmlProps {
    content: string;
    onLinkClick?: ((e: React.MouseEvent<HTMLAnchorElement>) => boolean) | null;
    elementRef?: Ref<HTMLDivElement> | null;
    className?: string;
    variant?: "compact" | "default";
}

const DescriptionHtml: FC<DescriptionHtmlProps> = ({
    content,
    onLinkClick = null,
    elementRef = null,
    className = "",
    variant: variant = "default",
}) => {
    return (
        <div
            ref={elementRef}
            className={`ngw-gui-component-description-html ngw-gui-component-description-html-${variant} ${className}`}
        >
            <ProcessedHtml htmlString={content} onLinkClick={onLinkClick} />
        </div>
    );
};

DescriptionHtml.displayName = "DescriptionHtml";

export { DescriptionHtml };
