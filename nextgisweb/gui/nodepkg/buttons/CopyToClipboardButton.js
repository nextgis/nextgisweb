import { Button, message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import ContentCopyIcon from "@nextgisweb/icon/material/content_copy";

export function CopyToClipboardButton({
    children,
    messageInfo,
    getTextToCopy,
    type,
    iconOnly,
}) {
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(getTextToCopy());
        message.info(messageInfo || gettext("Copied to clipboard"));
    };

    let buttonContent = null;
    if (!iconOnly) {
        buttonContent = children || gettext("Copy to clipboard");
    }

    return (
        <Button
            type={type}
            icon={<ContentCopyIcon />}
            onClick={() => copyToClipboard()}
        >
            {buttonContent}
        </Button>
    );
}
