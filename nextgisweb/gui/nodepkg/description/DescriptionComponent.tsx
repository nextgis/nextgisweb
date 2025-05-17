import type { Ref } from "react";

import "./description.css";
import { processHtmlWithImage } from "./processHTML";

type DescriptionComponent = {
    content: string;
    ref?: Ref<HTMLDivElement> | null;
    className?: string;
};

const DescriptionComponent = ({
    content,
    ref = null,
    className = "",
}: DescriptionComponent) => {
    const processedContent = processHtmlWithImage({ htmlString: content });

    return (
        <div ref={ref} className={`description-html ${className}`}>
            {processedContent}
        </div>
    );
};

DescriptionComponent.displayName = "Description";

export { DescriptionComponent };
