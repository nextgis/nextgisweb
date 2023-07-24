import { useCallback } from "react";

import { Button } from "@nextgisweb/gui/antd";

import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import {
    UseActionToolbarProps,
    ButtonProps,
    CreateButtonActionOptions,
} from "../type";

export function useActionToolbar({ size, props }: UseActionToolbarProps) {
    const createButtonAction = useCallback(
        ({
            action,
            icon,
            disabled,
            title,
            ...rest
        }: CreateButtonActionOptions) => {
            const btnAction: ButtonProps = { size, ...rest };
            if (action) {
                const onClick = () => {
                    action(props);
                };
                btnAction.onClick = onClick;
            }
            if (typeof disabled === "function") {
                btnAction.disabled = disabled(props);
            }
            if (typeof icon === "string") {
                btnAction.icon = <SvgIcon icon={icon} fill="currentColor" />;
            }
            return <Button {...btnAction}>{title}</Button>;
        },
        [props, size]
    );

    return { createButtonAction };
}
