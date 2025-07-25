import type { MessageInstance } from "antd/es/message/interface";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { message } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import type { EdiTableColumn } from "@nextgisweb/gui/edi-table/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { File, Store } from "./Store";
import "./Widget.less";

function showError(
    [status, msg]: [boolean, string | null],
    message: MessageInstance
) {
    if (!status) message.error(msg);
}

const columns: EdiTableColumn<File>[] = [
    {
        key: "display_name",
        component: ({ value }) => {
            return value as string;
        },
    },
];

export const Widget: EditorWidget<Store> = observer(({ store }) => {
    const [messageApi, contextHolder] = message.useMessage();
    const actions = useMemo(
        () => [
            <FileUploaderButton
                key="file"
                multiple={true}
                accept=".tiff,.tif"
                onChange={(value) => {
                    if (!value) return;
                    showError(store.appendFiles(value), messageApi);
                }}
                uploadText={gettext("Upload")}
            />,
        ],
        [messageApi, store]
    );

    return (
        <div className="ngw-raster-mosaic-resource-widget">
            {contextHolder}
            <ActionToolbar pad borderBlockEnd actions={actions} />
            <EdiTable
                columns={columns}
                store={store}
                rowKey="key"
                showHeader={false}
                parentHeight
            />
        </div>
    );
});

Widget.displayName = "Widget";
Widget.title = gettext("Rasters");
Widget.activateOn = { update: true };
