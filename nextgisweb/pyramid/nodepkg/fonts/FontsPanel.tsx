import { useState } from "react";

import type { CustomFont, SystemFont } from "@nextgisweb/core/type/api";
import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import {
    Button,
    Checkbox,
    Modal,
    Space,
    Spin,
    Table,
} from "@nextgisweb/gui/antd";
import type { TableColumnType } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import showModal from "@nextgisweb/gui/showModal";

import { route } from "../api";
import { useRouteGet } from "../hook";
import { gettext } from "../i18n";

type FontType = CustomFont | SystemFont;

// eslint-disable-next-line
const msgConfirm = gettext("During operation, the Web GIS will restart. All existing requests will aborted. Proceed? ")
const msgSuccess = gettext("Successfully restarted");
const msgRestarting = gettext("Web GIS is restarting");

const LoadingModal = (props: any) => {
    return (
        <Modal {...props} footer={null}>

               <Space direction="horizontal">
               {msgRestarting}
               <Spin />
                </Space> 

        </Modal>
    );
};

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
    const waitForRestart = async (timestamp: number) => {
        let resp = { started: 0 };

        const handleRestart = () => {
            clearInterval(connectionInterval);
            window.location.reload();
        };
        const connectionInterval = setInterval(async () => {
            try {
                resp = await route("pyramid.ping").get({ cache: false });
            } catch {
                //ignore
            } finally {
                console.log("Web GIS is not available. Retrying connection...");
            }
            if (resp.started > timestamp) {
                handleRestart();
            }
        }, 1000);
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
                if (resp.restarted) {
                    showModal(LoadingModal, { open: true });
                    await waitForRestart(resp.timestamp);
                }
            } catch {
                console.log("err");
            }
    };

    if (isLoading) {
        return <LoadingWrapper />;
    }
    return (
        <div>
            {contextHolder}

            <Space direction="horizontal">
                <FileUploaderButton
                    accept=".ttf,.otf"
                    onChange={(meta?: FileMeta[]) => {
                        if (meta) {
                            setFileMeta(meta);
                            save();
                        }
                    }}
                    multiple={true}
                />
                <Button
                    danger
                    disabled={selectedRowKeys.length <= 0}
                    onClick={() => {
                        setDeleted(selectedRowKeys);
                        save();
                    }}
                >
                    {gettext("Delete")}
                </Button>
                <Checkbox
                    checked={showSystem}
                    onClick={() => {
                        setShowSystem((showSystem) => !showSystem);
                    }}
                >
                    {showSystem}
                    {gettext("Show system fonts")}
                </Checkbox>
            </Space>

            <Table
                columns={columns}
                dataSource={data}
                rowSelection={{
                    type: "checkbox",
                    onChange: (keys: any) => setSelectedRowKeys(keys),
                    getCheckboxProps: (record) => ({
                        disabled: ["system"].includes(record.type),
                    }),
                }}
            />
        </div>
    );
}
