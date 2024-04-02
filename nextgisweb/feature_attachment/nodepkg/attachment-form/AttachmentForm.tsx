import type { RcFile } from "antd/es/upload/interface";
import { useState } from "react";

import { fileUploader } from "@nextgisweb/file-upload";
import { Button, Checkbox, Modal, Tabs, Upload } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import showModal from "@nextgisweb/gui/showModal";
import {
    LunkwillParam,
    request,
    route,
    routeURL,
} from "@nextgisweb/pyramid/api";
import type { RouteResp } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import pyramidSettings from "@nextgisweb/pyramid/settings!pyramid";

import "./AttachmentForm.less";

type ImportSuccessModalProps = ModalProps &
    RouteResp<"feature_attachment.import", "put">;

export function AttachmentForm({ id }: { id: number }) {
    const [loading, setLoading] = useState<"export" | "import">();

    // Export

    const doExport = async () => {
        const apiUrl = routeURL("feature_attachment.export", id);
        if (pyramidSettings.lunkwill_enabled) {
            const lunkwillParam = new LunkwillParam();
            lunkwillParam.require();
            try {
                setLoading("export");
                const respUrl = await request(apiUrl, {
                    lunkwill: lunkwillParam,
                    lunkwillReturnUrl: true,
                });
                window.open(respUrl);
            } catch (err) {
                errorModal(err as ApiError);
                return;
            } finally {
                setLoading(undefined);
            }
        } else {
            window.open(apiUrl);
        }
    };

    const exportTab = () => (
        <>
            <p>
                {gettext(
                    "Use export to copy feature attachments between different layers or to create a backup. The resulting ZIP archive will contain all of the attachments put in directories named after feature IDs. Attachment metadata are put into a separate JSON file."
                )}
            </p>
            <Button
                type="primary"
                disabled={loading && loading !== "export"}
                loading={loading === "export"}
                onClick={doExport}
            >
                {gettext("Export attachments to ZIP archive")}
            </Button>
        </>
    );

    // Import

    const [importReplace, setImportReplace] = useState(false);

    const backToResource = () => {
        window.open(routeURL("resource.show", { id: id }), "_self");
    };

    const ImportSuccessModal = ({
        result,
        ...props
    }: ImportSuccessModalProps) => (
        <Modal
            okText={gettext("Back to resource")}
            onOk={backToResource}
            cancelText={gettext("Close")}
            {...props}
        >
            {gettext("The archive has been successfully imported.")}
            <br />
            {gettext("Attachments imported - {i}, skipped - {s}.")
                .replace("{i}", result.imported)
                .replace("{s}", result.skipped)}
        </Modal>
    );

    const doImport = async (fileObj: RcFile) => {
        try {
            setLoading("import");
            const uploadedFiles = await fileUploader({ files: [fileObj] });
            const lunkwillParam = new LunkwillParam();
            lunkwillParam.suggest();
            const result = await route("feature_attachment.import", id).put({
                json: {
                    source: uploadedFiles[0],
                    replace: importReplace,
                },
                lunkwill: lunkwillParam,
            });
            const { destroy } = showModal(ImportSuccessModal, {
                result,
                onCancel: () => destroy(),
            });
        } catch (err) {
            errorModal(err as ApiError);
            return;
        } finally {
            setLoading(undefined);
        }
    };

    const importTab = () => (
        <>
            <p>
                {gettext(
                    "Upload a ZIP archive to batch append attachments to existing features. An archive must contain directories named after feature IDs. Each folder can contain one or many attachments. Duplicates will be ignored."
                )}
            </p>
            <p>
                <Checkbox
                    disabled={!!loading}
                    onChange={(e) => setImportReplace(e.target.checked)}
                >
                    {gettext("Delete existing attachments")}
                </Checkbox>
            </p>

            <Upload
                multiple={false}
                showUploadList={false}
                customRequest={({ file, onSuccess }) => {
                    if (onSuccess) {
                        onSuccess(file);
                    }
                }}
                onChange={({ file }) => {
                    const { status, originFileObj } = file;
                    if (status === "done" && originFileObj) {
                        doImport(originFileObj);
                    }
                }}
            >
                <Button
                    type="primary"
                    danger={importReplace}
                    disabled={loading && loading !== "import"}
                    loading={loading === "import"}
                >
                    {gettext("Import attachments from ZIP archive")}
                </Button>
            </Upload>
        </>
    );
    return (
        <Tabs
            className="ngw-feature-attachment-attachment-form"
            size="large"
            items={[
                {
                    key: "export",
                    label: gettext("Export"),
                    children: exportTab(),
                },
                {
                    key: "import",
                    label: gettext("Import"),
                    children: importTab(),
                },
            ]}
        />
    );
}
