import { useMemo } from "react";
import type { ReactNode } from "react";

import { mergeClasses } from "@nextgisweb/gui/util";

interface PageTitleProps {
    title?: string;
    pullRight?: boolean;
    children: ReactNode[] | ReactNode;
}

export function PageTitle({ title, pullRight, children }: PageTitleProps) {
    const ititle = useMemo(() => {
        // Capture an existing page title if not set
        return title || document.getElementById("title")?.innerText;
    }, [title]);

    return (
        <h1
            className={mergeClasses(
                "ngw-pyramid-layout-title",
                pullRight && "pull-right"
            )}
        >
            {ititle}
            {children}
        </h1>
    );
}
