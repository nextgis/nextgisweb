import type { MouseEventHandler } from "react";

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

interface CopyCallbacks {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}

interface ConditionalEventProps {
    onMouseDown?: MouseEventHandler<HTMLButtonElement>;
    onClick?: MouseEventHandler<HTMLButtonElement>;
}

const _copyToClipboard = async (
    textToCopy: string,
    callbacks?: CopyCallbacks
): Promise<void> => {
    try {
        await navigator.clipboard.writeText(textToCopy);
        callbacks?.onSuccess?.();
    } catch (err: unknown) {
        console.error("Failed to copy to clipboard:", err);
        callbacks?.onError?.(err);
    }
};

const IsTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;

export function CopyToClipboardButton({
    children,
    messageInfo,
    getTextToCopy,
    iconOnly,
    ...restParams
}: CopyToClipboardButtonProps) {
    const [messageApi, contextHolder] = message.useMessage();

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(getTextToCopy());
        messageApi.info(messageInfo || gettext("Copied to clipboard"));
    };

    let buttonContent: React.ReactNode | null = null;
    if (!iconOnly) {
        buttonContent = children || gettext("Copy to clipboard");
    }

    const eventProps: ConditionalEventProps = {};
    if (IsTouchDevice) {
        // Using onMouseDown because onClick doesn't fire on mobile
        // inside a Tooltip
        eventProps.onMouseDown = copyToClipboard;
    } else {
        eventProps.onClick = copyToClipboard;
    }

    return (
        <>
            {contextHolder}
            <Button
                icon={<ContentCopyIcon />}
                onClick={() => {
                    copyToClipboard();
                }}
                {...restParams}
            >
                {buttonContent}
            </Button>
        </>
    );
}

CopyToClipboardButton.displayName = "CopyToClipboardButton";
