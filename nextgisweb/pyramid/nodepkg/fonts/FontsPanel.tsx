import { useCallback, useMemo, useState } from "react";
import type React from "react";

import type { CustomFont, SystemFont } from "@nextgisweb/core/type/api";
import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import {
    Button,
    CheckboxValue,
    Flex,
    Modal,
    Spin,
    Table,
} from "@nextgisweb/gui/antd";
import type { ModalProps, TableColumnType } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import showModal from "@nextgisweb/gui/showModal";
import type { FontCUpdateBody } from "@nextgisweb/pyramid/type/api";

import { route } from "../api";
import { useRouteGet } from "../hook";
import { gettext } from "../i18n";

type FontType = CustomFont | SystemFont;

// prettier-ignore
const msgConfirm = gettext("During operation, the Web GIS will restart. All existing requests will be aborted. Proceed?");
const msgRestarting = gettext("Web GIS is restarting, please wait...");
const fontType = { custom: gettext("Custom"), system: gettext("System") };

const LoadingModal = (props: ModalProps) => {
    return (
        <Modal
            title={msgRestarting}
            styles={{ header: { textAlign: "center" } }}
            closable={false}
            footer={null}
            {...props}
        >
            <Spin
                size="large"
                style={{
                    display: "block",
                    textAlign: "center",
                    margin: "2rem",
                }}
            />
        </Modal>
    );
};

const waitForRestart = async (timestamp: number) => {
    let resp = { started: 0 };

    const handleRestart = () => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        clearInterval(connectionInterval);
        window.location.reload();
    };

    const connectionInterval = setInterval(async () => {
        try {
            resp = await route("pyramid.ping").get({ cache: false });
        } catch {
            // ignore
        } finally {
            console.log("Web GIS is not available. Retrying connection...");
        }
        if (resp.started > timestamp) {
            handleRestart();
        }
    }, 2000);
};

export function FontsPanel() {
    const [showSystem, setShowSystem] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

    const { data, isLoading } = useRouteGet("pyramid.font");

    // Generate synthetic keys for system fonts
    const dataWithKeys = useMemo(() => {
        if (!data) return undefined;
        return data.map((item, idx) => ({
            ...item,
            key: "key" in item ? item.key : `system_${idx}`,
        }));
    }, [data]);

    const [modal, contextHolder] = Modal.useModal();

    const filtered = showSystem
        ? { filtered: false }
        : {
              filteredValue: ["custom"],
              filtered: true,
              onFilter: (value: React.Key | boolean, record: FontType) =>
                  record.type.includes(value as string),
          };

    const columns: TableColumnType<FontType>[] = [
        {
            title: gettext("Font"),
            dataIndex: "label",
            key: "label",
        },
        {
            title: gettext("Format"),
            dataIndex: "format",
            key: "format",
        },
        {
            title: gettext("Type"),
            dataIndex: "type",
            key: "type",
            render: (_, record) => fontType[record.type],
            ...filtered,
        },
    ];

    const save = useCallback(
        async ({ remove, add }: FontCUpdateBody) => {
            const confirmed = await modal.confirm({ content: msgConfirm });
            if (confirmed)
                try {
                    const resp = await route("pyramid.font").put({
                        json: { remove, add },
                    });
                    if (resp.restarted) {
                        showModal(LoadingModal, { open: true });
                        await waitForRestart(resp.timestamp);
                    }
                } catch (error) {
                    errorModal(error as ApiError);
                }
        },
        [modal]
    );

    const onFileChange = useCallback(
        (meta?: FileMeta[]) => {
            if (meta) {
                save({ add: meta, remove: [] });
            }
        },
        [save]
    );

    if (isLoading) {
        return <LoadingWrapper />;
    }

    return (
        <div>
            {contextHolder}
            <Flex
                align="center"
                gap={"0.5rem"}
                style={{ marginBlockEnd: "0.5rem" }}
            >
                <FileUploaderButton
                    multiple={true}
                    accept=".ttf,.otf"
                    onChange={onFileChange}
                />
                <Button
                    danger
                    disabled={selectedRowKeys.length <= 0}
                    onClick={() => {
                        save({ add: [], remove: selectedRowKeys });
                    }}
                >
                    {gettext("Delete")}
                </Button>
                <CheckboxValue
                    value={showSystem}
                    onChange={setShowSystem}
                    style={{ marginInlineStart: "auto" }}
                >
                    {gettext("Show system fonts")}
                </CheckboxValue>
            </Flex>
            <Table
                className="ngw-card"
                columns={columns}
                dataSource={dataWithKeys}
                rowSelection={{
                    type: "checkbox",
                    onChange: (keys) => {
                        setSelectedRowKeys(keys.map(String));
                    },
                    getCheckboxProps: (record) => ({
                        disabled: ["system"].includes(record.type),
                    }),
                }}
            />
        </div>
    );
}
