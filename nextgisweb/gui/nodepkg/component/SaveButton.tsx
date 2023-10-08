import type { ReactNode } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ParamsOf } from "../type";

import SaveOutlineIcon from "@nextgisweb/icon/material/save/outline";

type ButtonProps = ParamsOf<typeof Button>;

export interface SaveButtonProps extends ButtonProps {
    children?: ReactNode;
}

export function SaveButton({ children, ...rest }: SaveButtonProps) {
    return (
        <Button type="primary" icon={<SaveOutlineIcon />} {...rest}>
            {children || gettext("Save")}
        </Button>
    );
}
