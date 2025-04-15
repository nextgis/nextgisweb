import type { AnyObject } from "antd/es/_util/type";
import type { ComponentType, Ref } from "react";

import type { InputRef, TableColumnType } from "../antd";

export type FunctionKeys<
    T,
    R extends AnyObject = AnyObject,
    RT = Required<T>,
> = {
    [K in keyof RT]: RT[K] extends (row: R) => void ? K : never;
}[keyof RT];

export interface EdiTableColumnComponentProps<R extends AnyObject> {
    /**
     * Current row
     */
    row: R;

    /**
     * Current cell's value
     */
    value: unknown;

    /**
     * Indicates if current row is placeholder row
     */
    placeholder?: boolean;

    /**
     * Reference to placeholder input
     *
     * Forward it to an underlying input component and it will be focused when
     * the Enter key is pressed.
     */
    placeholderRef?: Ref<InputRef>;
}

export interface EdiTableColumn<R extends AnyObject> extends TableColumnType {
    shrink?: boolean | string;
    component?: ComponentType<EdiTableColumnComponentProps<R>>;
}

export type { AnyObject };
