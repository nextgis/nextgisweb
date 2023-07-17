import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import MAllowIcon from "@material-icons/svg/check_circle";
import MDenyIcon from "@material-icons/svg/remove_circle";

export function ResourceIcon({ identity, ...props }) {
    return <SvgIcon icon={"rescls-" + identity} {...props} />;
}

export function AllowIcon(props) {
    return <MAllowIcon style={{ color: "var(--success)" }} {...props} />;
}

export function DenyIcon(props) {
    return <MDenyIcon style={{ color: "var(--danger)" }} {...props} />;
}
