import { useState } from "react";
import { fileUploader } from "@nextgisweb/file-upload";
import { Button, Checkbox, Upload } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { routeURL, request, LunkwillParam } from "@nextgisweb/pyramid/api";
import pyramidSettings from "@nextgisweb/pyramid/settings!pyramid";
import i18n from "@nextgisweb/pyramid/i18n!feature_attachment";

const { Dragger } = Upload;

export function AttachmentForm({ id }) {
    // Export
    const [loadingDownload, setLoadingDownload] = useState(false);

    const download = async () => {
        setLoadingDownload(true);
        let url = routeURL("feature_attachment.export", id);
        if (pyramidSettings.lunkwill_enabled) {
            const lunkwillParam = new LunkwillParam();
            lunkwillParam.require();
            url = await request(url, {
                lunkwill: lunkwillParam,
                lunkwillReturnUrl: true,
            });
        }
        window.open(url);
        setLoadingDownload(false);
    };

    // Import
    const [loadingImport, setLoadingImport] = useState(false);
    const [clearCurrent, setClearCurrent] = useState(false);

    const props = {
        multiple: false,
        showUploadList: false,
        onChange: async (info) => {
            setLoadingImport(true);
            const { status } = info.file;
            if (status === "done") {
                const uploadedFiles = await fileUploader({
                    files: [info.file.originFileObj]
                });
                const lunkwillParam = new LunkwillParam();
                lunkwillParam.suggest();
                let url = routeURL("feature_attachment.import", id);
                try {
                    await request(url, {
                        method: "PUT",
                        json: { source: uploadedFiles[0], clear: clearCurrent },
                        lunkwill: lunkwillParam,
                        lunkwillReturnUrl: true,
                    });
                } catch (err) {
                    errorModal(err);
                    return;
                } finally {
                    setLoadingImport(false);
                }
                window.open(routeURL("feature_layer.feature.browse", { id: id }), "_self");
            }
        }
    }

    return (
        <div>
            <div>
                <Upload
                    {...props}
                >
                    <Button type="primary" loading={loadingImport}>
                        {i18n.gettext("Import")}
                    </Button>
                </Upload>
                <Checkbox onChange={(e) => setClearCurrent(e.target.checked)}>
                    {i18n.gettext("Clear current attachments?")}
                </Checkbox>
            </div>
            <Button type="primary" loading={loadingDownload} onClick={download}>
                {i18n.gettext("Download as ZIP-archive")}
            </Button>
        </div>
    );
}
