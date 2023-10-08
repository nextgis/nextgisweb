import { useMemo } from "react";
import type { ReactNode } from "react";

interface PageTitleProps {
    title?: string;
    children: ReactNode[] | ReactNode;
}

export function PageTitle({ title, children }: PageTitleProps) {
    const ititle = useMemo(() => {
        // Capture an existing page title if not set
        return title || document.getElementById("title")?.innerText;
    }, [title]);

    return (
        <h1 className="ngw-pyramid-layout-title">
            {ititle}
            {children}
        </h1>
    );
}
