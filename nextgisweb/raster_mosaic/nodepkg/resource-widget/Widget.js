import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { message } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./Widget.less";

function showError([status, msg]) {
    if (!status) message.error(msg);
}

const columns = [
    {
        key: "display_name",
        component: ({ value }) => value,
    },
];

export const Widget = observer(({ store }) => {
    const actions = useMemo(
        () => [
            <FileUploaderButton
                key="file"
                multiple={true}
                accept=".tiff,.tif"
                onChange={(value) => {
                    if (!value) return;
                    showError(store.appendFiles(value));
                }}
                uploadText={gettext("Upload")}
            />,
        ],
        []
    );

    return (
        <div className="ngw-raster-mosaic-resource-widget">
            <ActionToolbar actions={actions} />
            <EdiTable
                {...{ store, columns }}
                rowKey="key"
                showHeader={false}
                parentHeight
            />
        </div>
    );
});

Widget.title = gettext("Rasters");
Widget.activateOn = { update: true };
