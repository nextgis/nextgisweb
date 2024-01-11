import type { AnyObject } from "antd/es/_util/type";

export interface EdiTableStore<Row extends AnyObject = AnyObject> {
    rows: Row[];
    placeholder?: Row | null;
    validate?: boolean;

    cloneRow: (row: Row) => void;
    deleteRow: (row: Row) => void;
}
