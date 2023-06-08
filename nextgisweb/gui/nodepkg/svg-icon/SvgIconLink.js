import { SvgIcon } from "./SvgIcon";
import { PropTypes } from "prop-types";

export function SvgIconLink({ children, icon, fill, iconProps, ...linkProps }) {
    return (
        <a {...linkProps}>
            <SvgIcon {...{ icon, fill, ...iconProps }} />
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
    iconProps: PropTypes.object,
};
