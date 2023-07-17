import { Button, Tooltip } from "../antd";

import DeleteIcon from "@material-icons/svg/clear";
import CloneIcon from "@material-icons/svg/copy_all";
import ErrorIcon from "@material-icons/svg/error";

import i18n from "@nextgisweb/pyramid/i18n";

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
        title: i18n.gettext("Clone"),
        icon: <CloneIcon/>,
    },
    delete: {
        callback: "deleteRow",
        title: i18n.gettext("Delete"),
        icon: <DeleteIcon/>,
    },
};
