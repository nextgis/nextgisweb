import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Select, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";
import AnnotationsStore from "@nextgisweb/webmap/store/annotations";
import type { AnnotationVisibleMode } from "@nextgisweb/webmap/store/annotations/AnnotationsStore";
import type { AnnotationsPermissions } from "@nextgisweb/webmap/type/api";

import { PanelHeader } from "../header";

import "./AnnotationsPanel.less";
import "../styles/panels.less";

type GeometryType = "Point" | "LineString" | "Polygon";

interface AnnotationFilter {
    public: boolean;
    own: boolean;
    private: boolean;
}

const ADD_ANNOTATION_STATE_KEY = "addAnnotation";

const AnnotationsPanel = observer(
    ({ display, title, close }: PanelComponentProps) => {
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

        let editSection;
        if (editable) {
            editSection = (
                <section>
                    <h5 className="heading">{gettext("Edit")}</h5>

                    <div className="input-group">
                        <Switch
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
                </section>
            );
        }

        return (
            <div className="ngw-panel ngw-webmap-annotations-panel">
                <PanelHeader title={title} close={close} />

                <section>
                    <h5 className="heading">{gettext("Annotations layer")}</h5>

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
                </section>

                {editSection}

                <section>
                    <h5 className="heading">
                        {gettext("Private annotations")}
                    </h5>

                    <div className="input-group">
                        <Switch
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
                </section>
            </div>
        );
    }
);

AnnotationsPanel.displayName = "AnnotationsPanel";

export default AnnotationsPanel;
