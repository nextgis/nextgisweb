/** @entrypoint */
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!"
import { default as ConfirmDialog } from "dijit/ConfirmDialog";
import { default as ErrorDialog } from "ngw-pyramid/ErrorDialog/ErrorDialog"

window.principal_delete = function (cls, id) {
    var content = cls === 'U' ? i18n.gettext("Delete user?") : i18n.gettext("Delete group?")
    var confirmDlg = new ConfirmDialog({
        title: i18n.gettext("Confirmation"),
        content: content
    });
    confirmDlg.on('execute', function () {
        var principalRoute = route(`auth.${cls === 'U' ? 'user' : 'group'}.item`, {id: id});
        principalRoute.delete().then(function () {
            window.location.reload();
        }, function (err) {
            new ErrorDialog(err).show();
        })
    });
    confirmDlg.show();
};
