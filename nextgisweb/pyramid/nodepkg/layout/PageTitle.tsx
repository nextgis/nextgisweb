import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { mergeClasses } from "@nextgisweb/gui/util";

interface PageTitleProps {
    title?: string;
    pullRight?: boolean;
    children: ReactNode[] | ReactNode;
}

export function PageTitle({ title, pullRight, children }: PageTitleProps) {
    const titleRef = useRef<HTMLElement | null>();

    const ititle = useMemo(() => {
        // Capture an existing page title if not set
        titleRef.current = document.getElementById("title");
        return title || titleRef.current?.innerText;
    }, [title]);

    useLayoutEffect(() => {
        // Delete existing header if it isn't replaced
        titleRef.current?.remove();
    }, []);

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
