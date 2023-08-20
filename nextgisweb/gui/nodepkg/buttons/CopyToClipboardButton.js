import ContentCopyIcon from "@material-icons/svg/content_copy";
import { Button, message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

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
