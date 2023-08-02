import { observer } from "mobx-react-lite";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./Widget.less";

// prettier-ignore
const uploaderMessages = {
    uploadText: gettext("Select a tileset"),
    helpText: gettext("MBTiles and ZIP archives of tiles are supported. Tiles should be in PNG or JPEG format and have a size of 256x256 pixels."),
};

export const Widget = observer(({ store }) => {
    return (
        <div className="ngw-tileset-resource-widget">
            <FileUploader
                onChange={(value) => {
                    store.source = value;
                }}
                onUploading={(value) => {
                    store.uploading = value;
                }}
                showMaxSize
                {...uploaderMessages}
            />
        </div>
    );
});

Widget.title = gettext("Tileset");
Widget.activateOn = { create: true };
