import { PropTypes } from "prop-types";

export function SvgIcon({ icon, fill, ...rest }) {
    return (
        <svg className="icon" fill={fill} {...rest}>
            <use xlinkHref={`#icon-${icon}`} />
        </svg>
    );
}

SvgIcon.propTypes = {
    icon: PropTypes.string.isRequired,
    fill: PropTypes.oneOf(["currentColor"]),
};
