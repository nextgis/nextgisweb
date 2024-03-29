import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Select, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import AnnotationsStore from "@nextgisweb/webmap/store/annotations/";

import { PanelHeader } from "../header";

import "./AnnotationsPanel.less";
import "../styles/panels.less";

const ADD_ANNOTATION_STATE_KEY = "addAnnotation";

export const AnnotationsPanel = observer(
    ({ display, title, close, mapStates, onTopicPublish }) => {
        const [visible, setVisible] = useState(undefined);
        const [editable, setEditable] = useState(false);
        const [edit, setEdit] = useState(false);
        const [annScope, setAnnScope] = useState(undefined);
        const [geomType, setGeomType] = useState("Point");
        const [annFilter, setAnnFilter] = useState({
            public: true,
            own: true,
            private: false,
        });

        const changeVisible = (visibleMode) => {
            setVisible(visibleMode);
            onTopicPublish(["/annotations/visible", visibleMode]);

            if (
                visibleMode === "no" &&
                edit &&
                mapStates.getActiveState() === ADD_ANNOTATION_STATE_KEY
            ) {
                changeEdit(false);
            }

            AnnotationsStore.setVisibleMode(visibleMode);
        };

        useEffect(() => {
            changeVisible(AnnotationsStore.visibleMode);

            const scope = display.config.annotations.scope;
            setAnnScope(scope);

            const _editable = scope.write;
            setEditable(_editable);
            if (_editable) mapStates.addState(ADD_ANNOTATION_STATE_KEY);
        }, []);

        if (
            visible === undefined ||
            mapStates === undefined ||
            annScope === undefined
        ) {
            return <></>;
        }

        const changeEdit = (beginEdit) => {
            if (beginEdit) {
                mapStates.activateState(ADD_ANNOTATION_STATE_KEY);
                changeVisible("messages");
                onTopicPublish(["webmap/annotations/add/activate", geomType]);
            } else {
                mapStates.deactivateState(ADD_ANNOTATION_STATE_KEY);
                onTopicPublish(["webmap/annotations/add/deactivate"]);
            }
            setEdit(beginEdit);
        };

        const changeGeomType = (geomType) => {
            setGeomType(geomType);
            onTopicPublish([
                "webmap/annotations/change/geometryType",
                geomType,
            ]);
        };

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
                            onChange={(v) => changeGeomType(v)}
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

        const changeAccessTypeFilters = (value, type) => {
            const changes = {};
            changes[type] = value;
            const newFilter = { ...annFilter, ...changes };
            setAnnFilter(newFilter);
            onTopicPublish(["webmap/annotations/filter/changed", newFilter]);
        };

        return (
            <div className="ngw-panel ngw-webmap-annotations-panel">
                <PanelHeader {...{ title, close }} />

                <section>
                    <h5 className="heading">{gettext("Annotations layer")}</h5>

                    <div className="input-group column">
                        <label>{gettext("Show annotations")}</label>
                        <Select
                            style={{ width: "100%" }}
                            onChange={(value) => changeVisible(value)}
                            value={visible}
                            options={[
                                { value: "no", label: gettext("No") },
                                { value: "yes", label: gettext("Yes") },
                                {
                                    value: "messages",
                                    label: gettext("With messages"),
                                },
                            ]}
                        ></Select>
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
                            onChange={(v) =>
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
                            onChange={(v) => changeAccessTypeFilters(v, "own")}
                        />
                        <span className="label own">
                            {gettext("My private annotations")}
                        </span>
                    </div>

                    {annScope.manage && (
                        <div className="input-group">
                            <Switch
                                checked={annFilter.private}
                                onChange={(v) =>
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
