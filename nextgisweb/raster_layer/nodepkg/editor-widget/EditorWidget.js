import { observer } from "mobx-react-lite";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { Checkbox } from "@nextgisweb/gui/antd";

import i18n from "@nextgisweb/pyramid/i18n";

import "./EditorWidget.less";

// prettier-ignore
const uploaderMessages = {
    uploadText: i18n.gettext("Select a dataset"),
    helpText: i18n.gettext("Dataset should be in GeoTIFF format."),
}

export const EditorWidget = observer(({ store }) => {
    return (
        <div className="ngw-raster-layer-editor-widget">
            <div>
                <FileUploader
                    onChange={(value) => {
                        store.source = value;
                    }}
                    onUploading={(value) => {
                        store.uploding = value;
                    }}
                    showMaxSize
                    {...uploaderMessages}
                />
            </div>
            <div>
                <Checkbox
                    checked={store.cog}
                    onChange={(e) => {
                        store.cog = e.target.checked;
                    }}
                >
                    {i18n.gettext("Cloud Optimized GeoTIFF (COG)")}
                </Checkbox>
            </div>
        </div>
    );
});

EditorWidget.title = i18n.gettext("Raster layer");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
