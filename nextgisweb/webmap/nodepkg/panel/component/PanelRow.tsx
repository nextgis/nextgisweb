import classNames from "classnames";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const PanelRow = forwardRef<
    HTMLDivElement,
    ComponentPropsWithoutRef<"div">
>(({ className, ...props }: ComponentPropsWithoutRef<"div">, ref) => (
    <div
        ref={ref}
        className={classNames("ngw-webmap-panel-row", className)}
        {...props}
    />
));

PanelRow.displayName = "PanelRow";
