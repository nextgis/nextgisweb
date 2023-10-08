import { gettext } from "@nextgisweb/pyramid/i18n";

import { Button, Tooltip } from "../antd";

import DeleteIcon from "@nextgisweb/icon/material/clear";
import CloneIcon from "@nextgisweb/icon/material/copy_all";
import ErrorIcon from "@nextgisweb/icon/material/error";

export function ActionButton({ onClick, title, icon, ...buttonProps }) {
    return (
        <Tooltip {...{ title }}>
            <Button
                onClick={onClick}
                icon={icon}
                type="text"
                shape="circle"
                {...buttonProps}
            />
        </Tooltip>
    );
}

export const ErrorButton = ({ message }) => (
    <ActionButton
        title={message}
        disabled={false}
        icon={<ErrorIcon style={{ color: "var(--error)" }} />}
    />
);

export const WELLKNOWN_ROW_ACTIONS = {
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
