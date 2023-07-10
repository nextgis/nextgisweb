import { observer } from "mobx-react-lite";
import { ImageUploader } from "@nextgisweb/file-upload/image-uploader";
import { Input } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";

import "./EditorWidget.less";

const { TextArea } = Input;

// prettier-ignore
const imageUploaderMessages = {
    uploadText: i18n.gettext("Select a preview image"),
    helpText: i18n.gettext("The image will be converted to PNG format and downscaled to 1600x630 pixels if it's bigger."),
}

export const EditorWidget = observer(({ store }) => {
    return (
        <div className="ngw-social-editor-widget">
            <ImageUploader
                image={store.imageExisting}
                onChange={(value) => {
                    store.imageUpdated = value;
                }}
                {...imageUploaderMessages}
            />
            <TextArea
                value={store.description}
                onChange={(e) => {
                    store.description = e.target.value;
                }}
                placeholder={i18n.gettext("Preview description")}
                autoSize
            />
        </div>
    );
});

EditorWidget.title = i18n.gettext("Social");
EditorWidget.order = 90;
