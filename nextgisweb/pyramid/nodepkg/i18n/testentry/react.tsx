/** @testentry react */
import { ExportIcon, ImportIcon } from "@nextgisweb/gui/icon";
import {
    gettext as _gettext,
    gettextf as _gettextf,
} from "@nextgisweb/pyramid/i18n";

import { Translated } from "../translated";

export default function TranslatedTest() {
    return (
        <>
            <Translated
                msgf={_gettextf("Hello, {first} {last}!")}
                args={{ first: "Arthur", last: "Dent" }}
            />
            <br />
            <Translated
                msgf={_gettextf("Do you prefer {a} or {b}?")}
                args={{ a: <ImportIcon />, b: <ExportIcon /> }}
            />
        </>
    );
}
