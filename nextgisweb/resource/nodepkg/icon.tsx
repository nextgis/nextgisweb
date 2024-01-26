import type { SVGProps } from "react";

import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import MAllowIcon from "@nextgisweb/icon/material/check_circle";
import MDenyIcon from "@nextgisweb/icon/material/remove_circle";

export function ResourceIcon({
    identity,
    ...props
}: SVGProps<SVGSVGElement> & { identity?: string }) {
    return <SvgIcon icon={"rescls-" + identity} {...props} />;
}

export function AllowIcon(props: SVGProps<SVGSVGElement>) {
    return <MAllowIcon style={{ color: "var(--success)" }} {...props} />;
}

export function DenyIcon(props: SVGProps<SVGSVGElement>) {
    return <MDenyIcon style={{ color: "var(--danger)" }} {...props} />;
}
