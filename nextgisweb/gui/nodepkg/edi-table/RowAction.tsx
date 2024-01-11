import type { AnyObject } from "antd/lib/_util/type";
import { observer } from "mobx-react-lite";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { Button, Tooltip } from "../antd";
import type { ButtonProps } from "../antd";

import type { EdiTableStore } from "./EdiTableStore";
import type { FunctionKeys } from "./type";

import DeleteIcon from "@nextgisweb/icon/material/clear";
import CloneIcon from "@nextgisweb/icon/material/copy_all";
import ErrorIcon from "@nextgisweb/icon/material/error";

export interface RowActionConfig<T> {
    callback: T;
    title: string;
    icon: React.ReactNode;
    error?: string;
}

export interface RowAction<R = AnyObject> {
    key: string;
    callback: (row: R) => void;
    title: string;
    icon: React.ReactNode;
}

interface RowActionsProps<R = AnyObject> {
    store: EdiTableStore;
    row: R;
    actions: RowAction[];
}

export function ActionButton({ title, ...buttonProps }: ButtonProps) {
    return (
        <Tooltip {...{ title }}>
            <Button type="text" shape="circle" {...buttonProps} />
        </Tooltip>
    );
}

export const ErrorButton = ({ message }: { message?: string }) => (
    <ActionButton
        title={message}
        disabled={false}
        icon={<ErrorIcon style={{ color: "var(--error)" }} />}
    />
);

export const RowActions = observer(
    ({ row, store, actions }: RowActionsProps) => {
        const errorMessage = store.validate && row.error;
        return (
            <>
                {errorMessage && <ErrorButton message={errorMessage} />}
                {actions.map(({ key, callback: cb, ...props }) => (
                    <ActionButton
                        key={key}
                        onClick={() => cb(row)}
                        {...props}
                    />
                ))}
            </>
        );
    }
);

export const WELLKNOWN_ROW_ACTIONS: Record<
    string,
    RowActionConfig<FunctionKeys<EdiTableStore>>
> = {
    clone: {
        callback: "cloneRow",
        title: gettext("Clone"),
        icon: <CloneIcon />,
    },
    delete: {
        callback: "deleteRow",
        title: gettext("Delete"),
        icon: <DeleteIcon />,
    },
};
