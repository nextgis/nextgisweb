import { useCallback } from "react";

import { Button, Tooltip } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import type {
    ButtonProps,
    CreateButtonActionOptions,
    UseActionToolbarProps,
} from "../type";

export function useActionToolbar({
    size,
    isFit,
    props,
}: UseActionToolbarProps) {
    const createButtonAction = useCallback(
        ({
            key,
            icon,
            title,
            disabled,
            action,
            tooltip,
            ...rest
        }: CreateButtonActionOptions) => {
            const btnAction: ButtonProps = { size, ...rest };
            if (action) {
                const onClick = () => {
                    action(props);
                };
                btnAction.onClick = onClick;
            }
            if (disabled) {
                btnAction.disabled =
                    typeof disabled === "function" ? disabled(props) : disabled;
            }

            let iconElement;
            if (typeof icon === "string") {
                iconElement = <SvgIcon icon={icon} fill="currentColor" />;
            } else {
                iconElement = icon;
            }

            btnAction.icon = iconElement;

            if (!isFit && icon) {
                return (
                    <Tooltip title={title}>
                        <Button key={key} {...btnAction} />
                    </Tooltip>
                );
            }

            const button = (
                <Button key={key} {...btnAction}>
                    {title}
                </Button>
            );

            if (tooltip) {
                return <Tooltip title={tooltip}>{button}</Tooltip>;
            }
            return button;
        },
        [props, size, isFit]
    );

    return { createButtonAction };
}
