import classNames from "classnames";
import type { ComponentPropsWithRef } from "react";

export function PanelRow({
    ref,
    className,
    ...props
}: ComponentPropsWithRef<"div">) {
    return (
        <div
            ref={ref}
            className={classNames("ngw-webmap-panel-row", className)}
            {...props}
        />
    );
}
