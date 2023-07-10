import { PropTypes } from "prop-types";

import SaveOutlineIcon from "@material-icons/svg/save/outline";
import i18n from "@nextgisweb/pyramid/i18n";
import { Button } from "@nextgisweb/gui/antd";

export function SaveButton({ children, loading = false, ...rest }) {
    return (
        <Button
            type="primary"
            icon={<SaveOutlineIcon />}
            loading={loading}
            {...rest}
        >
            {children || i18n.gettext("Save")}
        </Button>
    );
}

SaveButton.propTypes = {
    loading: PropTypes.bool,
    children: PropTypes.node,
};
