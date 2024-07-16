import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Input, Modal } from "@nextgisweb/gui/antd";
import type { InputProps } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import type {
    RecordItem,
    RecordOption,
} from "@nextgisweb/gui/edi-table/store/RecordItem";
import type {
    ComponentProps,
    EdiTableColumn,
} from "@nextgisweb/gui/edi-table/type";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { VendorParamsStore } from "../store/VendorParamsStore";

const msgTypeToAdd = gettext("Type to add a new vendor parameter");

const InputKey = observer(
    ({ row, placeholder }: ComponentProps<RecordItem>) => {
        return (
            <Input
                value={row.key}
                onChange={(e) => {
                    const props: Partial<RecordOption> = {
                        key: e.target.value,
                    };
                    if (row.value === undefined) {
                        props.value = "";
                    }
                    row.update(props);
                }}
                variant="borderless"
                placeholder={placeholder ? msgTypeToAdd : undefined}
            />
        );
    }
);

InputKey.displayName = "InputKey";

const InputValue = observer(({ row }: ComponentProps<RecordItem>) => {
    if (row.type === "string") {
        return (
            <Input
                value={row.value as InputProps["value"]}
                onChange={(e) => {
                    row.update({ value: e.target.value });
                }}
                variant="borderless"
            />
        );
    }

    return <></>;
});

InputValue.displayName = "InputValue";

const columns: EdiTableColumn<RecordItem>[] = [
    {
        key: "key",
        title: gettext("Key"),
        width: "50%",
        component: InputKey,
    },
    {
        key: "value",
        title: gettext("Value"),
        width: "50%",
        component: InputValue,
    },
];

export function VendorParamsModal({
    value,
    onChange,
    open: open_,
    ...props
}: {
    value?: Record<string, string>;
    onChange: (value?: Record<string, string>) => void;
} & ShowModalOptions) {
    const [store] = useState(new VendorParamsStore(value));
    const [open, setOpen] = useState(open_);

    const close = () => {
        setOpen(false);
    };

    const handleClose = () => {
        if (store.dirty) {
            const value = store.dump();
            onChange(value);
            close();
        } else {
            close();
        }
    };

    useEffect(() => {
        setOpen(open_);
    }, [open_]);

    return (
        <Modal
            title={gettext("Vendor parameters")}
            closable={false}
            open={open}
            onOk={handleClose}
            onCancel={handleClose}
            {...props}
        >
            <EdiTable store={store} columns={columns} rowKey="id" />
        </Modal>
    );
}
