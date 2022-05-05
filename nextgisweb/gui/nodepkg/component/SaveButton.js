import SaveOutlineIcon from "@material-icons/svg/save/outline";
import i18n from "@nextgisweb/pyramid/i18n!gui";
import { Button } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";

export function SaveButton(props) {
    return (
        <Button type="primary" icon={<SaveOutlineIcon />} {...props}>
            {props.children || i18n.gettext("Save")}
        </Button>
    );
}

SaveButton.propTypes = {
    children: PropTypes.node,
};
