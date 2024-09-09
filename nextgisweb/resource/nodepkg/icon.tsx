import type { SVGProps } from "react";

import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import MAllowIcon from "@nextgisweb/icon/material/check_circle/fill";
import MDenyIcon from "@nextgisweb/icon/material/do_not_disturb_on/fill";

export function ResourceIcon({
    identity,
    ...props
}: SVGProps<SVGSVGElement> & { identity?: ResourceCls }) {
    return <SvgIcon icon={"rescls-" + identity} {...props} />;
}

export function AllowIcon(props: SVGProps<SVGSVGElement>) {
    return <MAllowIcon style={{ color: "var(--success)" }} {...props} />;
}

export function DenyIcon(props: SVGProps<SVGSVGElement>) {
    return <MDenyIcon style={{ color: "var(--danger)" }} {...props} />;
}
