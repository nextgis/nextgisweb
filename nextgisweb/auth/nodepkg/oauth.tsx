import settings from "@nextgisweb/auth/client-settings";
import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

const {
    enabled,
    baseUrl,
    name: nameRaw,
    serverType,
    isDefault: isDefaultRaw,
    userBind: userBindRaw,
    groupMapping: groupMappingRaw,
} = settings.oauth;

const name = nameRaw || "OAuth";
const isDefault = isDefaultRaw || false;
const groupMapping = groupMappingRaw || false;
const userBind = userBindRaw || false;

const isNGID = serverType === "nextgisid";

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
    name,
    serverType,
    isNGID,
    isDefault,
    userBind,
    groupMapping,
};
