import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Select, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ANNOTATION_ADD_ID } from "@nextgisweb/webmap/constant";
import type {
  AccessFilter,
  AnnotationGeometryType,
  AnnotationVisibleMode,
} from "@nextgisweb/webmap/ui/annotations-manager";

import { PanelContainer, PanelSection } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import "./AnnotationsPanel.less";

const AnnotationsPanel = observer<PanelPluginWidgetProps>(
  ({ store, display }) => {
    const [edit, setEdit] = useState(false);
    const [geomType, setGeomType] = useState<AnnotationGeometryType>("Point");

    const changeVisible = useCallback(
      (visibleMode: AnnotationVisibleMode | null) => {
        display.annotationsManager.setVisibleMode(visibleMode);
      },
      [display.annotationsManager]
    );

    const changeEdit = useCallback(
      (beginEdit: boolean) => {
        if (beginEdit) {
          display.map.setMapState(ANNOTATION_ADD_ID);
          changeVisible("messages");
          display.annotationsManager.activateAddMode(geomType);
        } else {
          display.map.deactivateMapState(ANNOTATION_ADD_ID);
          display.annotationsManager.deactivateAddMode();
        }
        setEdit(beginEdit);
      },
      [changeVisible, display.annotationsManager, display.map, geomType]
    );

    const changeGeomType = useCallback(
      (type: AnnotationGeometryType): void => {
        setGeomType(type);
        display.annotationsManager.changeGeometryType(type);
      },
      [display.annotationsManager]
    );

    const changeAccessTypeFilters = useCallback(
      (value: boolean, type: keyof AccessFilter): void => {
        display.annotationsManager.setFilter({
          ...display.annotationsManager.filter,
          [type]: value,
        });
      },
      [display.annotationsManager]
    );

    const visible = display.annotationsManager.visibleMode;
    const annFilter = display.annotationsManager.filter;
    const annScope = display.config.annotations?.scope;
    const editable = !!annScope?.write;

    useEffect(() => {
      if (
        display.map.mapState !== ANNOTATION_ADD_ID ||
        (visible === "no" && edit)
      ) {
        changeEdit(false);
      }
    }, [visible, edit, display.map.mapState, changeEdit]);

    useEffect(() => {
      display.annotationsManager.start();
    }, [display.annotationsManager]);

    if (visible === null || visible === undefined || annScope === undefined) {
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
              <Switch size="small" checked={edit} onChange={changeEdit} />
              <span className="label">{gettext("Edit annotations")}</span>
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
              onChange={(v: boolean) => changeAccessTypeFilters(v, "public")}
            />
            <span className="label public">
              {gettext("Public annotations")}
            </span>
          </div>

          <div className="input-group">
            <Switch
              size="small"
              checked={annFilter.own}
              onChange={(v: boolean) => changeAccessTypeFilters(v, "own")}
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
                onChange={(v: boolean) => changeAccessTypeFilters(v, "private")}
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
