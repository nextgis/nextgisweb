import { useCallback } from "react";

import { Button } from "@nextgisweb/gui/antd";

import { SvgIcon } from "@nextgisweb/gui/svg-icon";

export function useActionToolbar({ size, props }) {
    const createButtonAction = useCallback(
        ({ action, icon, title, ...rest }) => {
            const btnAction = { size, ...rest };
            if (action) {
                const onClick = () => {
                    action(props);
                };
                btnAction.onClick = onClick;
            }
            if (typeof btnAction.disabled === "function") {
                btnAction.disabled = btnAction.disabled(props);
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
