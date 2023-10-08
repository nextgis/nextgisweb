/** @entrypoint */
import { default as ConfirmDialog } from "dijit/ConfirmDialog";

import { route, routeURL } from "@nextgisweb/pyramid/api";
import resourceSchema from "@nextgisweb/pyramid/api/load!resource/schema";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { default as ErrorDialog } from "ngw-pyramid/ErrorDialog";

window.principal_delete = function (cls, id) {
    const content =
        cls === "U" ? gettext("Delete user?") : gettext("Delete group?");
    const confirmDlg = new ConfirmDialog({
        title: gettext("Confirmation"),
        content: content,
    });
    confirmDlg.on("execute", function () {
        const principalRoute = route(
            `auth.${cls === "U" ? "user" : "group"}.item`,
            { id: id }
        );
        principalRoute.delete().then(
            function () {
                window.location.reload();
            },
            function (err) {
                const references_data =
                    err.data && err.data.data && err.data.data.references_data;
                if (references_data instanceof Array) {
                    const detail = document.createElement("ol");
                    for (const data of references_data) {
                        const item = document.createElement("li");

                        const [cls, id] = data;
                        const link = document.createElement("a");
                        link.href = routeURL("resource.show", { id: id });
                        link.target = "_blank";
                        link.innerText = `${resourceSchema.resources[cls].label} #${id}`;
                        item.appendChild(link);

                        detail.appendChild(item);
                    }
                    err.detail = detail.innerHTML;
                }
                new ErrorDialog(err).show();
            }
        );
    });
    confirmDlg.show();
};
