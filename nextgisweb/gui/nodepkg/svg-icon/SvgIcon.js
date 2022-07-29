import { PropTypes } from "prop-types";

export function SvgIcon({ icon, fill }) {
    return (
        <svg className="icon" fill={fill}>
            <use xlinkHref={`#icon-${icon}`} />
        </svg>
    );
}

SvgIcon.propTypes = {
    icon: PropTypes.string.isRequired,
    fill: PropTypes.string,
};
