/** @testentry react */
import * as falso from "@ngneat/falso";
import { clamp, range } from "lodash-es";
import { action, observable } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { InputValue } from "../antd";
import type { TableColumnType, TableProps } from "../antd";

import { EdiTable } from "./EdiTable";
import type { EdiTableStore } from "./EdiTableStore";
import type { EdiTableColumn } from "./type";

class Row {
    private static keySeq = 0;
    readonly key = ++Row.keySeq;

    @observable.ref accessor name: string = "";
    @observable.ref accessor phone: string = falso.randPhoneNumber();

    constructor(data: Partial<Row> = {}) {
        Object.assign(this, data);
    }

    @action.bound
    setName(value: string) {
        this.name = value;
    }
}

class Store implements EdiTableStore<Row> {
    readonly rows = observable.array<Row>();

    @observable.ref accessor placeholder = new Row();

    @action.bound
    rotatePlaceholder() {
        this.rows.push(this.placeholder);
        this.placeholder = new Row();
    }

    @action.bound
    cloneRow(row: Row) {
        const { name, phone } = row;
        const idx = this.rows.indexOf(row) + 1;
        this.rows.splice(idx, 0, new Row({ name, phone }));
    }

    @action.bound
    deleteRow(row: Row) {
        this.rows.remove(row);
    }

    @action.bound
    moveRow(row: Row, index: number) {
        index = clamp(index, 0, this.rows.length - 1);

        const newRows = this.rows.filter((item) => item !== row);
        newRows.splice(index, 0, row);
        this.rows.replace(newRows);
    }
}

export default function EdiTableTestEntry() {
    const [store] = useState(() => new Store());

    const columns = useMemo<EdiTableColumn<Row>[]>(
        () => [
            {
                key: "name",
                title: "Name",
                // eslint-disable-next-line react/display-name
                component: observer(({ row, placeholder }) => {
                    return (
                        <InputValue
                            variant="borderless"
                            placeholder="Type here..."
                            value={row.name}
                            onChange={(v) => {
                                row.setName(v);
                                if (placeholder) store.rotatePlaceholder();
                            }}
                        />
                    );
                }),
            },
            {
                key: "phone",
                title: "Phone",
            },
        ],
        [store]
    );

    useEffect(() => {
        range(5).forEach(() => {
            const name = falso.randFullName();
            store.rows.push(new Row({ name }));
        });
    }, [store]);

    const rowSelection: TableProps<Row>["rowSelection"] = {
        type: "radio",
        onChange: (
            selectedRowKeys: React.Key[],
            selectedRows: TableColumnType<any>[]
        ) => {
            console.log(
                `selectedRowKeys: ${selectedRowKeys}`,
                "selectedRows: ",
                selectedRows
            );
        },
    };

    return (
        <EdiTable<Row>
            card={true}
            columns={columns}
            store={store}
            rowKey="key"
            rowSelection={rowSelection}
        />
    );
}
