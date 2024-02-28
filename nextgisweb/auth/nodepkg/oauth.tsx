import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!auth";

const {
    enabled,
    default: sDefault,
    bind,
    server_type: type,
    display_name: name,
    base_url: baseUrl,
    group_mapping,
} = settings.oauth;

const isNGID = type === "nextgisid";

export function makeTeamManageButton(props?: ButtonProps) {
    if (isNGID && baseUrl) {
        const url =
            baseUrl.replace(/\/$/, "") +
            "/teammanage?nextgisweb=" +
            ngwConfig.instanceId;
        return (
            <Button type="primary" href={url} {...props}>
                {gettext("Manage team")}
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
    group_mapping,
};
