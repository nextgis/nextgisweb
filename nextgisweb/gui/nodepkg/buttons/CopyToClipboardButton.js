import {PropTypes} from "prop-types";
import {Button, message} from "@nextgisweb/gui/antd";
import ContentCopyIcon from "@material-icons/svg/content_copy";

import i18n from "@nextgisweb/pyramid/i18n";


export function CopyToClipboardButton({children, messageInfo, getTextToCopy, type}) {
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(getTextToCopy());
        message.info(messageInfo || i18n.gettext("Copied to clipboard"));
    };

    return (
        <Button
            type={type || "primary"}
            icon={<ContentCopyIcon/>}
            onClick={() => copyToClipboard()}
        >
            {children || i18n.gettext("Copy to clipboard")}
        </Button>
    );
}

CopyToClipboardButton.propTypes = {
    getTextToCopy: PropTypes.any,
    children: PropTypes.node,
    type: PropTypes.string,
    messageInfo: PropTypes.string
};
