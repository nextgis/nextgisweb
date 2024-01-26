import { Button, message } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import ContentCopyIcon from "@nextgisweb/icon/material/content_copy";

interface CopyToClipboardButtonProps extends ButtonProps {
    children?: React.ReactNode;
    iconOnly?: boolean;
    messageInfo?: string;
    getTextToCopy: () => string;
}

export function CopyToClipboardButton({
    children,
    messageInfo,
    getTextToCopy,
    iconOnly,
    ...restParams
}: CopyToClipboardButtonProps) {
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(getTextToCopy());
        message.info(messageInfo || gettext("Copied to clipboard"));
    };

    let buttonContent: React.ReactNode | null = null;
    if (!iconOnly) {
        buttonContent = children || gettext("Copy to clipboard");
    }

    return (
        <Button
            icon={<ContentCopyIcon />}
            onClick={() => {
                copyToClipboard();
            }}
            {...restParams}
        >
            {buttonContent}
        </Button>
    );
}
