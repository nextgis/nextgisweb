import { useState } from "react";

import type { CustomFont, SystemFont } from "@nextgisweb/core/type/api";
import {
    FileUploader,
    FileUploaderButton,
} from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { Button, Checkbox, Modal, Table, message } from "@nextgisweb/gui/antd";
import type { TableColumnType } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";

import { route } from "../api";
import { useRouteGet } from "../hook";
import { gettext } from "../i18n";

type FontType = CustomFont | SystemFont;
// eslint-disable-next-line
const msgConfirm = gettext("During operation, the Web GIS will restart. All existing requests will aborted. Proceed? ")
const msgSuccess = gettext("Successfully restarted")

export function FontsPanel() {
    const [fileMeta, setFileMeta] = useState<FileMeta[]>([]);
    const [showSystem, setShowSystem] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [deleted, setDeleted] = useState<string[]>([]);

    const [modal, contextHolder] = Modal.useModal();

    const { data, isLoading } = useRouteGet("pyramid.font");
    const filtered = showSystem
        ? { filtered: false }
        : {
              filteredValue: ["custom"],
              filtered: true,
              onFilter: (value: React.Key | boolean, record: FontType) =>
                  record.type.includes(value as string),
              hidden: true,
          };
    const columns: TableColumnType<FontType>[] = [
        {
            title: gettext("Label"),
            dataIndex: "label",
            key: "label",
        },
        {
            title: "Format",

            dataIndex: "format",
            key: "format",
        },
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            ...filtered,
        },
    ];
    const save = async () => {
        const confirmed = await modal.confirm({
            content: msgConfirm,
        });
        if (confirmed)
            try {
                const resp = await route("pyramid.font").put({
                    json: {
                        remove: deleted,
                        add: fileMeta,
                    },
                });
                const timestamp = resp.timestamp;
                if (resp.restarted) {
                    const start = await route("pyramid.ping").get();
                    if (start.started > timestamp) {
                        message.success({
                            content: msgSuccess
                        })
                    }
                }
            } catch {
                //ignore
            } finally {
                setFileMeta([]);
                window.location.reload();
            }
    };

    if (isLoading) {
        return <LoadingWrapper />;
    }
    return (
        <div>
            {contextHolder}
            <Checkbox
                checked={showSystem}
                onClick={() => {
                    setShowSystem((showSystem) => !showSystem);
                }}
            >
                {showSystem}
                {gettext("Show system fonts")}
            </Checkbox>
            <Button danger onClick={() => setDeleted(selectedRowKeys)}>
                {gettext("Delete")}
            </Button>
            <Table
                columns={columns}
                dataSource={data}
                rowSelection={{
                    type: "checkbox",
                    onChange: (keys: any) => setSelectedRowKeys(keys),
                    getCheckboxProps: (record) => ({
                        disabled: record.type === "system",
                    }),
                }}
            />
            <FileUploaderButton
                accept=".ttf,.otf"
                onChange={(meta?: FileMeta[]) => {
                    if (meta) setFileMeta(meta);
                }}
                multiple={true}
                showUploadList={true}
                showProgressInDocTitle
            />
            <SaveButton
                onClick={save}
                disabled={deleted.length === 0 && fileMeta.length === 0}
            />
        </div>
    );
}
