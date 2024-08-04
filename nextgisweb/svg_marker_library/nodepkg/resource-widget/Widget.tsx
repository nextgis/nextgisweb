import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button, Space, message } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import type { EdiTableColumn } from "@nextgisweb/gui/edi-table/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { File, Store } from "./Store";

import ClearIcon from "@nextgisweb/icon/material/close";
import ArchiveIcon from "@nextgisweb/icon/material/folder_zip";

import "./Widget.less";

function showError([status, msg]: [boolean, string | null]) {
    if (!status) message.error(msg);
}

const columns: EdiTableColumn<File>[] = [
    {
        key: "name",
        component: ({ value }) => value as string,
    },
];

export const Widget: EditorWidgetComponent<EditorWidgetProps<Store>> = observer(
    ({ store }) => {
        const actions = useMemo(
            () => [
                <FileUploaderButton
                    key="file"
                    multiple={true}
                    accept=".svg"
                    onChange={(value) => {
                        if (!value) return;
                        showError(store.appendFiles(value));
                    }}
                    uploadText={gettext("Add SVG files")}
                />,
                <FileUploaderButton
                    key="archive"
                    accept=".zip"
                    onChange={(value) => {
                        if (!value) return;
                        showError(store.fromArchive(value));
                    }}
                    uploadText={gettext("Import from ZIP archive")}
                />,
            ],
            [store]
        );

        return (
            <div className="ngw-svg-marker-library-resource-widget">
                {store.archive ? (
                    <div className="archive">
                        <Space>
                            {gettext("SVG markers will be imported from:")}
                            <ArchiveIcon />
                            {store.archive.name}
                            <Button
                                onClick={() => store.fromArchive(null)}
                                icon={<ClearIcon />}
                                type="text"
                                shape="circle"
                            />
                        </Space>
                    </div>
                ) : (
                    <>
                        <ActionToolbar pad borderBlockEnd actions={actions} />
                        <EdiTable
                            store={store}
                            columns={columns}
                            rowKey="id"
                            showHeader={false}
                            parentHeight
                        />
                    </>
                )}
            </div>
        );
    }
);

Widget.displayName = "Widget";
Widget.title = gettext("SVG marker library");
Widget.activateOn = { update: true };
