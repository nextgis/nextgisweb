import { PropTypes } from "prop-types";

import StraightIcon from "@material-icons/svg/straight";

export default function SortIcon({ dir }) {
    if (dir === "desc") {
        return (
            <span className="desc">
                <StraightIcon />
            </span>
        );
    } else if (dir === "asc") {
        return (
            <span className="asc">
                <StraightIcon />
            </span>
        );
    } else {
        return <></>;
    }
}

SortIcon.propTypes = {
    dir: PropTypes.string,
};
