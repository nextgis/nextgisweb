import { Button } from "@nextgisweb/gui/antd";
import settings from "@nextgisweb/pyramid/settings!auth";
import i18n from "@nextgisweb/pyramid/i18n!auth";

const {
    enabled,
    default: sDefault,
    bind,
    server_type: type,
    display_name: name,
    base_url: baseUrl,
} = settings.oauth;

const isNGID = type == "nextgisid";

export function makeTeamManageButton(props) {
    if (isNGID && baseUrl) {
        const url =
            baseUrl.replace(/\/$/, "") +
            "/teammanage?nextgisweb=" +
            ngwConfig.instanceId;
        return (
            <Button type="primary" href={url} {...props}>
                {i18n.gettext("Manage team")}
            </Button>
        );
    } else {
        return undefined;
    }
}

export default {
    enabled,
    default: sDefault,
    bind,
    name,
    type,
    isNGID,
};
