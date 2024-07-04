import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { message } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import type { EdiTableColumn } from "@nextgisweb/gui/edi-table/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { File, Store } from "./Store";
import "./Widget.less";

function showError([status, msg]: [boolean, string | null]) {
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

export const Widget: EditorWidgetComponent<EditorWidgetProps<Store>> = observer(
    ({ store }) => {
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
            [store]
        );

        return (
            <div className="ngw-raster-mosaic-resource-widget">
                <ActionToolbar actions={actions} />
                <EdiTable
                    columns={columns}
                    store={store}
                    rowKey="key"
                    showHeader={false}
                    parentHeight
                />
            </div>
        );
    }
);

Widget.title = gettext("Rasters");
Widget.activateOn = { update: true };
Widget.displayName = "Widget";
