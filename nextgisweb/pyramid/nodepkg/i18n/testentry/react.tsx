/** @testentry react */

import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

const templateNamedReactNodes = gettextf(
    "For this task try {icon} {serviceName}, {username}."
);

const templatePositionedReactNodes = gettextf("Do you prefer {0} or {1}?");

const PositionedParamsComponent = templatePositionedReactNodes(
    <>
        <SvgIcon icon={"rescls-wfsserver_service"} />{" "}
        <b>{gettext("WFS connection")}</b>
    </>,
    <>
        <SvgIcon icon={"rescls-ogcfserver_service"} />{" "}
        <b>{gettext("OGC API Features")}</b>
    </>
);

const NamedParamsComponent = templateNamedReactNodes({
    icon: <SvgIcon icon={"rescls-wfsserver_service"} />,
    serviceName: <b>{gettext("WFS connection")}</b>,
    username: "Ford",
});

function InterpolationWithReactNodeTest() {
    return (
        <>
            {NamedParamsComponent}
            <br />
            {PositionedParamsComponent}
        </>
    );
}

export default InterpolationWithReactNodeTest;
