import { SvgIcon } from "./SvgIcon";
import { PropTypes } from "prop-types";

export function SvgIconLink({ children, icon, fill, ...linkProps }) {
    return (
        <a {...linkProps}>
            <SvgIcon {...{ icon, fill }} />
            {children}
        </a>
    );
}

SvgIconLink.propTypes = {
    icon: PropTypes.string.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func,
    fill: PropTypes.string,
    children: PropTypes.node,
};
