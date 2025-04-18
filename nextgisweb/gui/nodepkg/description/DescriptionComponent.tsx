import type { Ref } from "react";
import "./description.css";

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
    return (
        <div
            ref={ref}
            className={`description-html ${className}`}
            dangerouslySetInnerHTML={{
                __html: content ?? "",
            }}
        />
    );
};

DescriptionComponent.displayName = "Description";

export { DescriptionComponent };
