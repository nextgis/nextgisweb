import { observer } from "mobx-react-lite";

import { Checkbox, Select } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { annotation, editing } from "@nextgisweb/pyramid/settings!webmap";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import { SrsSelect } from "@nextgisweb/spatial-ref-sys/srs-select/SrsSelect";

import type { BookmarkResource } from "../type/WebmapResource";

import type { SettingStore } from "./SettingStore";
import { BookmarkResourceSelect } from "./component/BookmarkResourceSelect";
import { ExtentRow } from "./component/ExtentRow";
import type { AnnotationType } from "./type";

const [msgHelpInitialExtent, msgHelpConstrainingExtent] = [
    gettext("Web map will start at this extent"),
    gettext("Web map will not allow to move outside of this extent"),
];

const legendSymbolsOptions = [
    { value: "expand", label: gettext("Expand") },
    { value: "collapse", label: gettext("Collapse") },
    { value: "disable", label: gettext("Disable") },
];

const annotationOptions: { value: AnnotationType; label: string }[] = [
    { value: "no", label: gettext("Hide by default") },
    { value: "yes", label: gettext("Show without messages") },
    { value: "messages", label: gettext("Show with messages") },
];

export const SettingsWidget: EditorWidgetComponent<
    EditorWidgetProps<SettingStore>
> = observer(({ store }) => {
    const updateBookmarkResource = ({
        bookmarkResource,
    }: {
        bookmarkResource: BookmarkResource | null;
    }) => {
        store.update({ bookmarkResource: bookmarkResource });
    };

    return (
        <Area pad cols={["1fr", "1fr"]}>
            <Lot
                row
                label={gettext("Initial extent")}
                help={msgHelpInitialExtent}
            >
                <ExtentRow
                    pickerOptions={{ parentId: store.composite.parent }}
                    value={store.extent}
                    onChange={(value) => {
                        store.setExtent(value);
                    }}
                />
            </Lot>
            <Lot
                row
                label={gettext("Constraining extent")}
                help={msgHelpConstrainingExtent}
            >
                <ExtentRow
                    pickerOptions={{ parentId: store.composite.parent }}
                    value={store.extentConst}
                    onChange={(value) => {
                        store.setConstrainedExtent(value);
                    }}
                />
            </Lot>
            <Lot label={gettext("Legend")}>
                <Select
                    value={store.legendSymbols}
                    onChange={(v) => {
                        store.update({ legendSymbols: v });
                    }}
                    placeholder={gettext("Default")}
                    style={{ width: "100%" }}
                    options={legendSymbolsOptions}
                    allowClear
                />
            </Lot>
            <Lot label={gettext("Annotations")}>
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
                    placeholder={gettext("Select mode")}
                    style={{ width: "100%" }}
                    allowClear
                />
            </Lot>
            <Lot row label={gettext("Bookmarks")}>
                <BookmarkResourceSelect
                    pickerOptions={{ parentId: store.composite.parent }}
                    value={store.bookmarkResource}
                    onChange={updateBookmarkResource}
                />
            </Lot>
            <Lot row label={gettext("Measurement SRS")}>
                <SrsSelect
                    value={store.measureSrs}
                    onChange={(v: number) => {
                        store.update({ measureSrs: v });
                    }}
                    placeholder={gettext("Default")}
                    style={{ width: "100%" }}
                />
            </Lot>
            <Lot label={gettext("Layers editing")}>
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

SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
