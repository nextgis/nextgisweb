import { observer } from "mobx-react-lite";
import { useState } from "react";

import { ImageUploader } from "@nextgisweb/file-upload/image-uploader";
import { Input } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";

import "./EditorWidget.less";

const { TextArea } = Input;

// prettier-ignore
const msgImageUploader = {
    uploadText: gettext("Select a preview image"),
    helpText: gettext("The image will be converted to PNG format and downscaled to 1600x630 pixels if it's bigger."),
}

export const EditorWidget: EditorWidgetComponent<
    EditorWidgetProps<EditorStore>
> = observer(({ store }) => {
    const [image, setImage] = useState<string>();
    if (store.imageExisting) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(store.imageExisting);
    }

    return (
        <div className="ngw-social-editor-widget">
            <ImageUploader
                image={image}
                onChange={(value) => {
                    store.update({
                        imageUpdated: value === undefined ? null : value,
                    });
                }}
                {...msgImageUploader}
            />
            <TextArea
                value={store.description || ""}
                onChange={(e) => {
                    store.update({ description: e.target.value });
                }}
                placeholder={gettext("Preview description")}
                autoSize
            />
        </div>
    );
});

EditorWidget.title = gettext("Social");
EditorWidget.order = 90;
