import PropTypes from "prop-types";

import { Number } from "./Number";

export function Integer(props) {
    const inputProps = props.inputProps || {};
    inputProps.formatter = (v) => {
        return v ? String(parseInt(v, 10)) : '';
    };

    return <Number {...props} inputProps={inputProps}></Number>;
}

Integer.propTypes = {
    inputProps: PropTypes.object,
};
