import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Badge, Button, InputValue, Modal, Select } from "@nextgisweb/gui/antd";
import { ExtentRow } from "@nextgisweb/gui/component";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";
import { SrsSelect } from "@nextgisweb/spatial-ref-sys/srs-select/SrsSelect";
import settings from "@nextgisweb/webmap/client-settings";
import type { WebMapRead } from "@nextgisweb/webmap/type/api";

import { SelectLegendSymbols } from "../component";

import { OptionsWidget } from "./OptionsWidget";
import type { SettingStore } from "./SettingStore";

const { annotation } = settings;

type AnnotationType = WebMapRead["annotation_default"];

const msgInitExtent = gettext("Initial extent");
const msgConstrExtent = gettext("Constraining extent");
const msgTitle = gettext("Title");
const msgLegend = gettext("Legend");
const msgAnnotations = gettext("Annotations");
const msgAnnotationsPlaceholder = gettext("Select mode");
const msgBookmarks = gettext("Bookmarks");
const msgBookmarksPlaceholder = gettext("Select resource");
const msgMeasurementSrs = gettext("Measurement SRS");
const msgLayersEditing = gettext("Layers editing");
const msgAdditionalOptions = gettext("Additional options");
const msgConfigure = gettext("Configure");

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

const editingOptions = [
    { value: false, label: gettext("Disable") },
    { value: true, label: gettext("Enable") },
];

export const SettingsWidget: EditorWidget<SettingStore> = observer(
    ({ store }) => {
        const [optionsModal, setOptionsModal] = useState(false);
        return (
            <>
                <Area pad cols={["1fr", "1fr"]}>
                    <Lot row label={msgInitExtent} help={msgInitExtentHelp}>
                        <ExtentRow
                            pickerOptions={{
                                parentId: store.composite.parent || undefined,
                            }}
                            value={store.initialExtent}
                            onChange={(value) => {
                                store.setExtent(value);
                            }}
                        />
                    </Lot>
                    <Lot row label={msgConstrExtent} help={msgConstrExtentHelp}>
                        <ExtentRow
                            pickerOptions={{
                                parentId: store.composite.parent ?? undefined,
                            }}
                            value={store.constrainingExtent}
                            onChange={(value) => {
                                store.setConstrainedExtent(value);
                            }}
                        />
                    </Lot>
                    <Lot row label={msgTitle}>
                        <InputValue
                            value={store.title || ""}
                            onChange={(v) => store.update({ title: v })}
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
                                store.annotationEnabled
                                    ? store.annotationDefault
                                    : null
                            }
                            onChange={(annotationDefault) => {
                                store.update(
                                    annotationDefault
                                        ? {
                                              annotationEnabled: true,
                                              annotationDefault,
                                          }
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
                                initParentId: store.composite.parent,
                                requireInterface: "IFeatureLayer",
                            }}
                            value={store.bookmarkResource}
                            allowClear
                            placeholder={msgBookmarksPlaceholder}
                            style={{ width: "100%" }}
                            onChange={(bookmarkResource) =>
                                store.update({
                                    bookmarkResource: bookmarkResource,
                                })
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
                        <Select<boolean, { value: boolean; label: string }>
                            value={store.editable}
                            onChange={(v) => store.update({ editable: v })}
                            options={editingOptions}
                            style={{ width: "100%" }}
                        />
                    </Lot>
                    <Lot label={msgAdditionalOptions}>
                        <Button
                            onClick={() => setOptionsModal(true)}
                            style={{ width: "100%", justifyContent: "start" }}
                        >
                            {msgConfigure}
                            <Badge
                                size="small"
                                count={Object.keys(store.options).length}
                            />
                        </Button>
                    </Lot>
                </Area>
                <Modal
                    title={msgAdditionalOptions}
                    open={optionsModal}
                    footer={null}
                    width={600}
                    onCancel={() => setOptionsModal(false)}
                >
                    <OptionsWidget store={store} />
                </Modal>
            </>
        );
    }
);

SettingsWidget.displayName = "SettingsWidget";
SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
