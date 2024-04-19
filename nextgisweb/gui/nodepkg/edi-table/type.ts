import type { AnyObject } from "antd/es/_util/type";
import type { ColumnType } from "antd/lib/table";

export type FunctionKeys<
    T,
    R extends AnyObject = AnyObject,
    RT = Required<T>,
> = {
    [K in keyof RT]: RT[K] extends (row: R) => void ? K : never;
}[keyof RT];

export type AntTableCollumn = ColumnType<AnyObject>;

export interface ComponentProps<R extends AnyObject = AnyObject> {
    value: unknown;
    row: R;
    placeholder?: boolean | string;
}

export interface EdiTableColumn<R extends AnyObject = AnyObject>
    extends AntTableCollumn {
    shrink?: boolean | string;
    component?: React.ComponentType<ComponentProps<R>>;
}
