import type { AnyObject } from "antd/es/_util/type";

import type { TableColumnType } from "../antd";

export type FunctionKeys<
    T,
    R extends AnyObject = AnyObject,
    RT = Required<T>,
> = {
    [K in keyof RT]: RT[K] extends (row: R) => void ? K : never;
}[keyof RT];

export interface ComponentProps<R extends AnyObject = AnyObject> {
    value: unknown;
    row: R;
    placeholder?: boolean | string;
}

export interface EdiTableColumn<R extends AnyObject = AnyObject>
    extends TableColumnType {
    shrink?: boolean | string;
    component?: React.ComponentType<ComponentProps<R>>;
}

export type { AnyObject };
