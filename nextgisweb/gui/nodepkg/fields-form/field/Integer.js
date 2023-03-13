import PropTypes from "prop-types";

import { Number } from "./Number";

export function Integer(props) {
    const inputProps = props.inputProps || {};
    const maxint = 2 ** 63 - 1;
    inputProps.max = props.max ?? maxint;

    inputProps.formatter = (v) => {
        let int = parseInt(v, 10);
        int = int > inputProps.max ? inputProps.max : int;
        return v ? String(int) : "";
    };

    return <Number inputProps={inputProps} {...props}></Number>;
}

Integer.propTypes = {
    inputProps: PropTypes.object,
    max: PropTypes.number,
    min: PropTypes.number,
};
