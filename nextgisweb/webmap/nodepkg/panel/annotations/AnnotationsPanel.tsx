import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Select, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import AnnotationsStore from "@nextgisweb/webmap/store/annotations";
import type { AnnotationVisibleMode } from "@nextgisweb/webmap/store/annotations/AnnotationsStore";
import type { AnnotationsPermissions } from "@nextgisweb/webmap/type/api";

import { PanelContainer, PanelSection } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import "./AnnotationsPanel.less";

type GeometryType = "Point" | "LineString" | "Polygon";

interface AnnotationFilter {
    public: boolean;
    own: boolean;
    private: boolean;
}

const ADD_ANNOTATION_STATE_KEY = "addAnnotation";

const AnnotationsPanel = observer<PanelPluginWidgetProps>(
    ({ store, display }) => {
        const [visible, setVisible] = useState(AnnotationsStore.visibleMode);
        const [editable, setEditable] = useState(false);
        const [edit, setEdit] = useState(false);
        const [annScope, setAnnScope] = useState<
            AnnotationsPermissions | undefined
        >();
        const [geomType, setGeomType] = useState<GeometryType>("Point");
        const [annFilter, setAnnFilter] = useState<AnnotationFilter>({
            public: true,
            own: true,
            private: false,
        });

        const changeVisible = useCallback(
            (visibleMode: AnnotationVisibleMode | null) => {
                setVisible(visibleMode);
                topic.publish("/annotations/visible", visibleMode);
                AnnotationsStore.setVisibleMode(visibleMode);
            },
            []
        );

        const changeEdit = useCallback(
            (beginEdit: boolean) => {
                if (beginEdit) {
                    display.mapStates.activateState(ADD_ANNOTATION_STATE_KEY);
                    changeVisible("messages");
                    topic.publish("webmap/annotations/add/activate", geomType);
                } else {
                    display.mapStates.deactivateState(ADD_ANNOTATION_STATE_KEY);
                    topic.publish("webmap/annotations/add/deactivate");
                }
                setEdit(beginEdit);
            },
            [changeVisible, display.mapStates, geomType]
        );

        const changeGeomType = useCallback((type: GeometryType): void => {
            setGeomType(type);
            topic.publish("webmap/annotations/change/geometryType", type);
        }, []);

        const changeAccessTypeFilters = useCallback(
            (value: boolean, type: keyof AnnotationFilter): void => {
                setAnnFilter((prevFilter) => {
                    const newFilter = { ...prevFilter, [type]: value };
                    topic.publish(
                        "webmap/annotations/filter/changed",
                        newFilter
                    );
                    return newFilter;
                });
            },
            []
        );

        useEffect(() => {
            changeVisible(AnnotationsStore.visibleMode);

            const scope = display.config.annotations.scope;
            setAnnScope(scope);

            const _editable = scope.write;
            setEditable(_editable);
            if (_editable) display.mapStates.addState(ADD_ANNOTATION_STATE_KEY);
        }, [changeVisible, display]);

        useEffect(() => {
            if (
                visible === "no" &&
                edit &&
                display.mapStates.getActiveState() === ADD_ANNOTATION_STATE_KEY
            ) {
                changeEdit(false);
            }
        }, [visible, edit, changeEdit, display.mapStates]);

        if (
            visible === undefined ||
            display.mapStates === undefined ||
            annScope === undefined
        ) {
            return null;
        }

        return (
            <PanelContainer
                className="ngw-webmap-panel-annotations"
                title={store.title}
                close={store.close}
            >
                <PanelSection flex>
                    <div className="input-group column">
                        <label>{gettext("Show annotations")}</label>
                        <Select
                            style={{ width: "100%" }}
                            onChange={changeVisible}
                            value={visible}
                            options={[
                                { value: "no", label: gettext("No") },
                                { value: "yes", label: gettext("Yes") },
                                {
                                    value: "messages",
                                    label: gettext("With messages"),
                                },
                            ]}
                        />
                    </div>
                </PanelSection>

                {editable && (
                    <PanelSection title={gettext("Edit")} flex>
                        <div className="input-group">
                            <Switch
                                size="small"
                                checked={edit}
                                onChange={(v) => changeEdit(v)}
                            />
                            <span className="label">
                                {gettext("Edit annotations")}
                            </span>
                        </div>

                        <div className="input-group column">
                            <label>{gettext("Geometry type")}</label>
                            <Select
                                style={{ width: "100%" }}
                                onChange={changeGeomType}
                                disabled={!edit}
                                value={geomType}
                                options={[
                                    { value: "Point", label: gettext("Point") },
                                    {
                                        value: "LineString",
                                        label: gettext("Line"),
                                    },
                                    {
                                        value: "Polygon",
                                        label: gettext("Polygon"),
                                    },
                                ]}
                            ></Select>
                        </div>
                    </PanelSection>
                )}

                <PanelSection title={gettext("Private annotations")} flex>
                    <div className="input-group">
                        <Switch
                            size="small"
                            checked={annFilter.public}
                            onChange={(v: boolean) =>
                                changeAccessTypeFilters(v, "public")
                            }
                        />
                        <span className="label public">
                            {gettext("Public annotations")}
                        </span>
                    </div>

                    <div className="input-group">
                        <Switch
                            size="small"
                            checked={annFilter.own}
                            onChange={(v: boolean) =>
                                changeAccessTypeFilters(v, "own")
                            }
                        />
                        <span className="label own">
                            {gettext("My private annotations")}
                        </span>
                    </div>

                    {annScope.manage && (
                        <div className="input-group">
                            <Switch
                                size="small"
                                checked={annFilter.private}
                                onChange={(v: boolean) =>
                                    changeAccessTypeFilters(v, "private")
                                }
                            />
                            <span className="label private">
                                {gettext("Other private annotations")}
                            </span>
                        </div>
                    )}
                </PanelSection>
            </PanelContainer>
        );
    }
);

AnnotationsPanel.displayName = "AnnotationsPanel";
export default AnnotationsPanel;
