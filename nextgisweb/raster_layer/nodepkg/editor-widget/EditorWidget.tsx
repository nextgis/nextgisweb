import { observer } from "mobx-react-lite";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { Checkbox } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";
import "./EditorWidget.less";

// prettier-ignore
const uploaderMessages = {
    uploadText: gettext("Select a dataset"),
    helpText: gettext("Dataset should be in GeoTIFF format."),
}

export const EditorWidget: EditorWidgetComponent<
    EditorWidgetProps<EditorStore>
> = observer(({ store }) => {
    return (
        <div className="ngw-raster-layer-editor-widget">
            <div>
                <FileUploader
                    onChange={(value) => {
                        store.update({ source: value });
                    }}
                    onUploading={(value) => {
                        store.update({ uploading: value });
                    }}
                    showMaxSize
                    multiple={false}
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
                    {gettext("Cloud Optimized GeoTIFF (COG)")}
                </Checkbox>
            </div>
        </div>
    );
});

EditorWidget.title = gettext("Raster layer");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
