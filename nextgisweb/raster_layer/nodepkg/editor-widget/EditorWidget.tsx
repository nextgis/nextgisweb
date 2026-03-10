import { observer } from "mobx-react-lite";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { CheckboxValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";

/* prettier-ignore */ const
msgSelectDataset = gettext("Select a dataset"),
msgSupportedFormats = gettext("Supported formats: GeoTIFF, JPEG, and PNG with GDAL PAM metadata (.aux.xml files). Multi-file datasets should be uploaded as ZIP archives."),
msgCog = gettext("Cloud Optimized GeoTIFF (COG)");

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    return (
      <Area pad>
        <Lot label={false}>
          <FileUploader
            onChange={(value) => store.update({ source: value })}
            onUploading={(value) => store.update({ uploading: value })}
            multiple={false}
            uploadText={msgSelectDataset}
            helpText={msgSupportedFormats}
            showMaxSize
          />
        </Lot>
        <Lot label={false}>
          <CheckboxValue
            value={store.cog}
            onChange={(v) => store.update({ cog: v })}
          >
            {msgCog}
          </CheckboxValue>
        </Lot>
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Raster layer");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
