import { observer } from "mobx-react-lite";

import { Checkbox, Select } from "@nextgisweb/gui/antd";
import { ExtentRow } from "@nextgisweb/gui/component";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { annotation, editing } from "@nextgisweb/pyramid/settings!webmap";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import { SrsSelect } from "@nextgisweb/spatial-ref-sys/srs-select/SrsSelect";
import type { WebMapRead } from "@nextgisweb/webmap/type/api";

import { SelectLegendSymbols } from "../component";

import type { SettingStore } from "./SettingStore";

type AnnotationType = WebMapRead["annotation_default"];

const msgInitExtent = gettext("Initial extent");
const msgConstrExtent = gettext("Constraining extent");
const msgLegend = gettext("Legend");
const msgAnnotations = gettext("Annotations");
const msgAnnotationsPlaceholder = gettext("Select mode");
const msgBookmarks = gettext("Bookmarks");
const msgBookmarksPlaceholder = gettext("Select resource");
const msgMeasurementSrs = gettext("Measurement SRS");
const msgLayersEditing = gettext("Layers editing");

const msgDefault = gettext("Default");

const [msgInitExtentHelp, msgConstrExtentHelp] = [
    gettext("Web map will start at this extent"),
    gettext("Web map will not allow to move outside of this extent"),
];

const annotationOptions: { value: AnnotationType; label: string }[] = [
    { value: "no", label: gettext("Hide by default") },
    { value: "yes", label: gettext("Show without messages") },
    { value: "messages", label: gettext("Show with messages") },
];

export const SettingsWidget: EditorWidgetComponent<
    EditorWidgetProps<SettingStore>
> = observer(({ store }) => {
    return (
        <Area pad cols={["1fr", "1fr"]}>
            <Lot row label={msgInitExtent} help={msgInitExtentHelp}>
                <ExtentRow
                    pickerOptions={{ parentId: store.composite.parent }}
                    value={store.extent}
                    onChange={(value) => {
                        store.setExtent(value);
                    }}
                />
            </Lot>
            <Lot row label={msgConstrExtent} help={msgConstrExtentHelp}>
                <ExtentRow
                    pickerOptions={{ parentId: store.composite.parent }}
                    value={store.extentConst}
                    onChange={(value) => {
                        store.setConstrainedExtent(value);
                    }}
                />
            </Lot>
            <Lot label={msgLegend}>
                <SelectLegendSymbols
                    value={store.legendSymbols}
                    onChange={(v) => {
                        store.update({ legendSymbols: v });
                    }}
                    style={{ width: "100%" }}
                    allowClear
                />
            </Lot>
            <Lot label={msgAnnotations}>
                <Select<AnnotationType>
                    disabled={!annotation}
                    value={
                        store.annotationEnabled ? store.annotationDefault : null
                    }
                    onChange={(annotationDefault) => {
                        store.update(
                            annotationDefault
                                ? { annotationEnabled: true, annotationDefault }
                                : { annotationEnabled: false }
                        );
                    }}
                    options={annotationOptions}
                    placeholder={msgAnnotationsPlaceholder}
                    style={{ width: "100%" }}
                    allowClear
                />
            </Lot>
            <Lot row label={msgBookmarks}>
                <ResourceSelectRef
                    pickerOptions={{
                        parentId: store.composite.parent,
                        requireInterface: "IFeatureLayer",
                    }}
                    value={store.bookmarkResource}
                    allowClear
                    placeholder={msgBookmarksPlaceholder}
                    style={{ width: "100%" }}
                    onChange={(bookmarkResource) =>
                        store.update({ bookmarkResource: bookmarkResource })
                    }
                />
            </Lot>
            <Lot row label={msgMeasurementSrs}>
                <SrsSelect
                    value={store.measureSrs}
                    onChange={(v: number) => {
                        store.update({ measureSrs: v });
                    }}
                    placeholder={msgDefault}
                    style={{ width: "100%" }}
                />
            </Lot>
            <Lot label={msgLayersEditing}>
                <Checkbox
                    disabled={!editing}
                    checked={store.editable}
                    onChange={(e) => {
                        store.update({ editable: e.target.checked });
                    }}
                />
            </Lot>
        </Area>
    );
});

SettingsWidget.displayName = "SettingsWidget";
SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
