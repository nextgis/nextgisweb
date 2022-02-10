import { SaveOutlined } from "@ant-design/icons";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import { Button } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";

export function SaveButton(props) {
    return (
        <Button type="primary" icon={<SaveOutlined />} {...props}>
            {props.children || i18n.gettext("Save")}
        </Button>
    );
}

SaveButton.propTypes = {
    children: PropTypes.node,
};
