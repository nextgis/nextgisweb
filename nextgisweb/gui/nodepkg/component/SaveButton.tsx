import SaveOutlineIcon from "@material-icons/svg/save/outline";
import i18n from "@nextgisweb/pyramid/i18n";
import { Button } from "@nextgisweb/gui/antd";

import type { ReactNode } from "react";
import type { ParamsOf } from "../type";

type ButtonProps = ParamsOf<typeof Button>;

export interface SaveButtonProps extends ButtonProps {
    children?: ReactNode;
}

export function SaveButton({ children, ...rest }: SaveButtonProps) {
    return (
        <Button type="primary" icon={<SaveOutlineIcon />} {...rest}>
            {children || i18n.gettext("Save")}
        </Button>
    );
}
