import { useEffect, useState } from "react";

import type { CustomFont, SystemFont } from "@nextgisweb/core/type/api";
import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { Button, Checkbox, Modal, Table, message } from "@nextgisweb/gui/antd";
import type { TableColumnType } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";

import { route } from "../api";
import { useRouteGet } from "../hook";
import { gettext } from "../i18n";

type UploadedFont = Omit<CustomFont, "type"> & { type: "upload" };

type FontType = CustomFont | SystemFont | UploadedFont;

// eslint-disable-next-line
const msgConfirm = gettext("During operation, the Web GIS will restart. All existing requests will aborted. Proceed? ")
const msgSuccess = gettext("Successfully restarted");

export function FontsPanel() {
    const [fileMeta, setFileMeta] = useState<FileMeta[]>([]);
    const [showSystem, setShowSystem] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [deleted, setDeleted] = useState<string[]>([]);

    const [modal, contextHolder] = Modal.useModal();

    const { data, isLoading } = useRouteGet("pyramid.font");
    const [fonts, setFonts] = useState<FontType[]>([]);

    useEffect(() => {
        if (!isLoading && fonts.length <= 0) {
            // if (!isLoading) {
            // setFonts({key: 2});
            setFonts(data as FontType[]);
        }
    }, [data, fonts, isLoading]);

    useEffect(() => {
        if (fileMeta.length > 0 && fonts.length > 0) {
            const newItems = fileMeta.map((file) => {
                const [name_, ext] = file.name.split(".");
                const name = name_
                    .replace(/-/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2");

                return {
                    label: name,
                    type: "upload",
                    format: ext === "ttf" ? "TrueType" : "OpenType",
                    key: "uploaded_" + file.name,
                };
            }) as UploadedFont[];

            setFonts([...fonts, ...newItems]);
        }
    }, [fileMeta]);

    useEffect(() => {
        if (deleted.length > 0 && fonts.length > 0) {
            const fontsAfterRemoved = fonts.filter(
                (font) => !deleted.includes(font.key)
            );
            setFonts(fontsAfterRemoved);
        }
    }, [deleted]);

    const filtered = showSystem
        ? { filtered: false }
        : {
              filteredValue: ["custom", "upload"],
              filtered: true,
              onFilter: (value: React.Key | boolean, record: FontType) =>
                  record.type.includes(value as string),
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

    const reset = () => {
        if (!isLoading) {
            setFonts(data as FontType[]);
            setSelectedRowKeys([]);
        }
    };

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
                            content: msgSuccess,
                        });
                    }
                }
            } catch {
                //ignore
            } finally {
                setFileMeta([]);
                setDeleted([]);
                setFonts([]);
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
            <Button
                danger
                disabled={selectedRowKeys.length <= 0}
                onClick={() => {
                    setDeleted(selectedRowKeys);
                    setSelectedRowKeys([]);
                }}
            >
                {gettext("Delete")}
            </Button>
            <Button
                disabled={deleted.length > 0 && fileMeta.length > 0}
                onClick={reset}
            >
                {gettext("Reset")}
            </Button>
            <FileUploaderButton
                accept=".ttf,.otf"
                onChange={(meta?: FileMeta[]) => {
                    if (meta) setFileMeta(meta);
                }}
                multiple={true}
            />
            <Table
                columns={columns}
                dataSource={fonts}
                rowSelection={{
                    type: "checkbox",
                    onChange: (keys: any) => setSelectedRowKeys(keys),
                    getCheckboxProps: (record) => ({
                        disabled: ["system", "upload"].includes(record.type),
                    }),
                }}
            />

            <SaveButton
                onClick={save}
                disabled={deleted.length === 0 && fileMeta.length === 0}
            />
        </div>
    );
}
