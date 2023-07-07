import { useState, useEffect } from "react";
import { PropTypes } from "prop-types";
import { Switch, Select } from "@nextgisweb/gui/antd";

import { FloatingLabel } from "@nextgisweb/gui/floating-label";
import i18n from "@nextgisweb/pyramid/i18n";

import "./AnnotationsPanel.less";

const ADD_ANNOTATION_STATE_KEY = "addAnnotation";

export const AnnotationsPanel = ({
    display,
    mapStates,
    initialAnnotVisible,
    onTopicPublish,
    onChangeVisible,
}) => {
    const [visible, setVisible] = useState(undefined);
    const [editable, setEditable] = useState(false);
    const [edit, setEdit] = useState(false);
    const [annScope, setAnnScope] = useState(undefined);
    const [geomType, setGeomType] = useState("Point");
    const [displayTypes, setDisplayTypes] = useState(undefined);
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

        if (onChangeVisible) {
            onChangeVisible(visibleMode);
        }
    };

    const changeAnnTypesDisplay = (shouldDisplay) => {
        setDisplayTypes(shouldDisplay);
        if (shouldDisplay) {
            document.body.classList.add("ann-types-display");
        } else {
            document.body.classList.remove("ann-types-display");
        }
    };

    useEffect(() => {
        const visibleDefault =
            initialAnnotVisible || display.config.annotations.default;
        changeVisible(visibleDefault);

        changeAnnTypesDisplay(true);

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
        onTopicPublish(["webmap/annotations/change/geometryType", geomType]);
    };

    let editSection;
    if (editable) {
        editSection = (
            <>
                <h5 className="heading">{i18n.gettext("Edit")}</h5>

                <div className="input-group">
                    <Switch checked={edit} onChange={(v) => changeEdit(v)} />
                    <span className="checkbox__label">
                        {i18n.gettext("Edit annotations")}
                    </span>
                </div>

                <FloatingLabel
                    label={i18n.gettext("Geometry type")}
                    value={geomType}
                >
                    <Select
                        style={{ width: "100%" }}
                        onChange={(v) => changeGeomType(v)}
                        disabled={!edit}
                        value={geomType}
                        options={[
                            { value: "Point", label: i18n.gettext("Point") },
                            {
                                value: "LineString",
                                label: i18n.gettext("Line"),
                            },
                            {
                                value: "Polygon",
                                label: i18n.gettext("Polygon"),
                            },
                        ]}
                    ></Select>
                </FloatingLabel>
            </>
        );
    }

    let otherPrivateAnnSection;
    if (annScope.manage) {
        otherPrivateAnnSection = (
            <>
                <div className="input-group">
                    <Switch
                        checked={annFilter.private}
                        onChange={(v) => changeAccessTypeFilters(v, "private")}
                    />
                    <span className="checkbox__label">
                        {i18n.gettext("Other private annotations")}
                    </span>
                </div>
            </>
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
        <div className="annotations-panel">
            <h5 className="heading">{i18n.gettext("Annotations layer")}</h5>

            <FloatingLabel
                label={i18n.gettext("Show annotations")}
                name="name"
                value={visible}
            >
                <Select
                    style={{ width: "100%" }}
                    onChange={(value) => changeVisible(value)}
                    value={visible}
                    options={[
                        { value: "no", label: i18n.gettext("No") },
                        { value: "yes", label: i18n.gettext("Yes") },
                        {
                            value: "messages",
                            label: i18n.gettext("With messages"),
                        },
                    ]}
                ></Select>
            </FloatingLabel>

            {editSection}

            <h5 className="heading">{i18n.gettext("Private annotations")}</h5>

            <div className="input-group">
                <Switch
                    checked={displayTypes}
                    onChange={(v) => changeAnnTypesDisplay(v)}
                />
                <span className="checkbox__label">
                    {i18n.gettext("Show annotation types")}
                </span>
            </div>

            <div className="input-group">
                <Switch
                    checked={annFilter.public}
                    onChange={(v) => changeAccessTypeFilters(v, "public")}
                />
                <span className="checkbox__label">
                    {i18n.gettext("Public annotations")}
                </span>
            </div>

            <div className="input-group">
                <Switch
                    checked={annFilter.own}
                    onChange={(v) => changeAccessTypeFilters(v, "own")}
                />
                <span className="checkbox__label">
                    {i18n.gettext("My private annotations")}
                </span>
            </div>

            {otherPrivateAnnSection}
        </div>
    );
};

AnnotationsPanel.propTypes = {
    display: PropTypes.object,
    mapStates: PropTypes.object,
    initialAnnotVisible: PropTypes.string,
    onTopicPublish: PropTypes.func,
    onChangeVisible: PropTypes.func,
};
