import { ButtonControl } from "./ButtonControl";
import type { ButtonControlProps } from "./ButtonControl";

import Icon from "@nextgisweb/icon/material/open_in_new";

type LinkToControlProps = ButtonControlProps & {
    url: string;
    target?: React.HTMLAttributeAnchorTarget;
};

export function LinkToControl({
    url,
    target = "_blank",
    ...props
}: LinkToControlProps) {
    return (
        <ButtonControl
            onClick={() => {
                window.open(url, target);
            }}
            {...props}
        >
            <Icon />
        </ButtonControl>
    );
}
