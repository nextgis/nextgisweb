import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";
import type { CSSProperties } from "react";

import {
  Button,
  CheckboxValue,
  Empty,
  Input,
  Modal,
  Space,
} from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FeatureGridStore } from "../FeatureGridStore";
import { LAST_CHANGED_FIELD_ID } from "../constant";

import CheckedIcon from "@nextgisweb/icon/material/check_box";
import UncheckedIcon from "@nextgisweb/icon/material/check_box_outline_blank";
import DragHandleIcon from "@nextgisweb/icon/material/drag_indicator";

import "./TableConfigModal.less";

const msgTitle = gettext("Configure table columns");
const msgSearchPlaceholder = gettext("Search columns");
const msgEnableAll = gettext("Enable all");
const msgDisableAll = gettext("Disable all");
const msgNoFields = gettext("No fields");

type Field = Pick<FeatureGridStore["fields"][number], "id" | "display_name">;

interface SortableFieldProps {
  field: Field;
  visible: boolean;
  onChange: (value: boolean) => void;
}

function SortableField({ field, visible, onChange }: SortableFieldProps) {
  const sortable = field.id !== LAST_CHANGED_FIELD_ID;
  const {
    listeners,
    transform,
    transition,
    isDragging,
    attributes,
    setActivatorNodeRef,
    setNodeRef,
  } = useSortable({ id: field.id, disabled: !sortable });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
  };

  return (
    <div ref={setNodeRef} className="field" style={style}>
      <Button
        ref={setActivatorNodeRef}
        type="text"
        size="small"
        icon={<DragHandleIcon />}
        disabled={!sortable}
        style={sortable ? { cursor: "move", touchAction: "none" } : undefined}
        {...attributes}
        {...listeners}
      />
      <CheckboxValue
        className="field-checkbox"
        value={visible}
        onChange={onChange}
      >
        {field.display_name}
      </CheckboxValue>
    </div>
  );
}

const TableConfigModal = observer(({ store }: { store: FeatureGridStore }) => {
  const { settingsOpen, visibleFields, fields } = store;
  const [search, setSearch] = useState("");

  const allFields = store.versioning
    ? [
        ...fields,
        {
          id: LAST_CHANGED_FIELD_ID,
          display_name: gettext("Last changed"),
        },
      ]
    : fields;

  const filteredFields: Field[] = allFields.filter((field) =>
    field.display_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );

  const close = () => {
    store.setSettingsOpen(false);
  };

  const toggle = useCallback(
    (fieldId: number, value: boolean) => {
      const old = store.visibleFields;
      const visibleFieald = !value
        ? old.filter((oldF) => oldF !== fieldId)
        : [...old, fieldId];
      store.setVisibleFields(visibleFieald);
    },
    [store]
  );

  const toggleAll = (value: boolean) => {
    const fieldIds = filteredFields.map((field) => field.id);

    const old = store.visibleFields;
    const visibleFields = value
      ? [...old, ...fieldIds.filter((fieldId) => !old.includes(fieldId))]
      : old.filter((fieldId) => !fieldIds.includes(fieldId));
    store.setVisibleFields(visibleFields);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      store.setFields(arrayMove(fields, oldIndex, newIndex));
    }
  };

  return (
    <Modal
      className="ngw-feature-layer-table-config-modal"
      title={msgTitle}
      open={settingsOpen}
      onOk={close}
      onCancel={close}
      footer={null}
    >
      <div className="controls">
        <Space.Compact>
          <Button
            onClick={() => toggleAll(true)}
            title={msgEnableAll}
            icon={<CheckedIcon />}
          ></Button>
          <Button
            onClick={() => toggleAll(false)}
            title={msgDisableAll}
            icon={<UncheckedIcon />}
          ></Button>
        </Space.Compact>
        <Input
          className="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={msgSearchPlaceholder}
          allowClear
        />
      </div>
      <div className="fields">
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext
            items={filteredFields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredFields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                visible={visibleFields.includes(field.id)}
                onChange={(value) => toggle(field.id, value)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {!filteredFields.length && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={msgNoFields}
          />
        )}
      </div>
    </Modal>
  );
});

TableConfigModal.displayName = "TableConfigModal";
export default TableConfigModal;
