import { useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import {
    EdiTable,
    EdiTableKeyInput,
    EdiTableValueInput,
} from "@nextgisweb/gui/edi-table";
import type {
    EdiTableColumn,
    EdiTableKeyValueRow,
} from "@nextgisweb/gui/edi-table";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { VendorParamsStore } from "../store/VendorParamsStore";

const columns: EdiTableColumn<EdiTableKeyValueRow<string>>[] = [
    {
        key: "key",
        title: gettext("Key"),
        width: "50%",
        component: EdiTableKeyInput,
    },
    {
        key: "value",
        title: gettext("Value"),
        width: "50%",
        component: EdiTableValueInput,
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
