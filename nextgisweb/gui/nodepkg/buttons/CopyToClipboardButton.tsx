import type { MouseEventHandler } from "react";

import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { layoutStore } from "@nextgisweb/pyramid/layout";

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
    const copyToClipboard = async () => {
        await _copyToClipboard(getTextToCopy(), {
            onSuccess: () => {
                layoutStore.message?.info(
                    messageInfo || gettext("Copied to clipboard")
                );
            },
            onError: () => {
                layoutStore.message?.error(
                    gettext("Failed to copy to clipboard. Please try again.")
                );
            },
        });
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
        <Button icon={<ContentCopyIcon />} {...eventProps} {...restParams}>
            {buttonContent}
        </Button>
    );
}

CopyToClipboardButton.displayName = "CopyToClipboardButton";
