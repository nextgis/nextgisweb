import classNames from "classnames";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

interface PageTitleProps {
    title?: string;
    pullRight?: boolean;
    children: ReactNode[] | ReactNode;
}

export function PageTitle({ title, pullRight, children }: PageTitleProps) {
    const titleRef = useRef<HTMLElement>(null);

    const ititle = useMemo(() => {
        // Capture an existing page title if not set
        titleRef.current = document.getElementById("title");
        return title || titleRef.current?.innerText;
    }, [title]);

    useLayoutEffect(() => {
        // Delete existing header if it isn't replaced
        titleRef.current?.parentElement?.remove();
    }, []);

    return (
        <div
            className={classNames("ngw-pyramid-layout-title", {
                "pull-right": pullRight,
            })}
        >
            <h1>{ititle}</h1>
            {children}
        </div>
    );
}
