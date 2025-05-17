import type { Ref } from "react";

import "./description.css";
import { processHtmlWithImage } from "./processHTML";

type DescriptionComponent = {
    content: string;
    elementRef?: Ref<HTMLDivElement> | null;
    className?: string;
};

const DescriptionComponent = ({
    content,
    elementRef = null,
    className = "",
}: DescriptionComponent) => {
    const processedContent = processHtmlWithImage({ htmlString: content });

    return (
        <div ref={elementRef} className={`description-html ${className}`}>
            {processedContent}
        </div>
    );
};

DescriptionComponent.displayName = "Description";

export { DescriptionComponent };
