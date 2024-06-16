import { useContext } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Tooltip } from "@nextgisweb/gui/antd";

import { AreaContext } from "./Area";

import ErrorIcon from "@nextgisweb/icon/material/error_outline";
import HelpIcon from "@nextgisweb/icon/material/help_outline";

export interface LotProps {
    label?: string | false;
    help?: string;
    error?: string | boolean;
    start?: number;
    end?: number;
    span?: number;
    row?: true;
    visible?: boolean;
    children?: ReactNode;
}

export function Lot({ children, ...props }: LotProps) {
    const { labelPosition: lp, columnCount: cc } = useContext(AreaContext)!;

    if (props.visible === false) return <></>;

    const [w, o] = lp === "left" ? [2, 1] : [1, 0];

    let { start, end, span } = props;
    const { label, help, error, row } = props;

    if (row) {
        if (start !== undefined || end !== undefined || span !== undefined)
            throw new TypeError("Props 'start', 'end' and 'span' with 'row'");
        [start, end] = [1, -1];
    }

    if (start !== undefined) {
        if (start < 0) start = cc + start + 1;
        start = (start - 1) * w + 1;
    }

    if (end !== undefined) {
        if (span !== undefined)
            throw new TypeError("Props 'end' and 'span' are exclusive");
        if (end < 0) end = cc + end + 1;
        end = (end - 1) * w + 2 + o;
    }

    if (span !== undefined) span = 1 + (span - 1) * w;
    if (label === false) span = (span || 1) + o;

    const gridColumnStart = start;
    const gridColumnEnd = end || (span ? `span ${span}` : undefined);
    const cssStart: CSSProperties = gridColumnStart ? { gridColumnStart } : {};
    const cssEnd: CSSProperties = gridColumnEnd ? { gridColumnEnd } : {};

    let labelElement: ReactNode;
    if (labelElement) {
        labelElement = undefined;
    } else {
        labelElement = <div>{label}</div>;
        if (error) {
            labelElement = (
                <>
                    {labelElement}{" "}
                    <div className="error">
                        <Tooltip title={error}>
                            <ErrorIcon />
                        </Tooltip>
                    </div>
                </>
            );
        } else if (help !== undefined) {
            labelElement = (
                <>
                    {labelElement}{" "}
                    <div className="help">
                        <Tooltip title={help}>
                            <HelpIcon />
                        </Tooltip>
                    </div>
                </>
            );
        }
    }

    let labelContainer: ReactNode;
    if (label === false) {
        labelContainer = undefined;
    } else if (lp === "left") {
        labelContainer = <label style={cssStart}>{labelElement}</label>;
    } else if (lp === "top") {
        labelContainer = <label>{labelElement}</label>;
    }

    const style: CSSProperties = {};
    if (lp === "left") {
        if (start && end) cssEnd.gridColumnStart = start + 1;
        children = <div style={cssEnd}>{children}</div>;
    } else if (lp === "top") {
        Object.assign(style, cssStart, cssEnd);
        children = <div>{children}</div>;
    }

    return (
        <div className="lot" style={style}>
            {labelContainer}
            {children}
        </div>
    );
}
