import { Suspense, memo, useMemo } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Dropdown, message } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { useAbortController } from "@nextgisweb/pyramid/hook";

import {
  getResourceActionGroup,
  registry,
  resourceActionGroups,
} from "../../registry";
import type { ResourceActionGroupId } from "../../registry";
import type { DefaultResourceSectionAttrs } from "../../type";
import type {
  ChildrenResource,
  RenderActionsProps,
  RenderResourceAction,
} from "../type";
import { byMenuOrder, byQuickOrder } from "../util/attrActionSort";

import { ActionBtn } from "./ActionBtn";
import type { ActionBtnProps } from "./ActionBtn";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";

function RenderAction({
  action,
  record,
  attributes,
  setAttrItems,
}: {
  action: RenderResourceAction;
  record: ChildrenResource;
  attributes: [...typeof DefaultResourceSectionAttrs];
  setAttrItems: RenderActionsProps["setAttrItems"];
}) {
  const { showModal, modalHolder } = useShowModal();
  const [messageApi, messageHolder] = message.useMessage();
  const { makeSignal } = useAbortController();

  const props: ActionBtnProps = {
    size: "small",
    label: action.label,
    icon: action.icon,
    showLabel: false,

    ...(action.props ?? {}),
  };

  const run = action.run;

  if (run) {
    props.onClick = () => {
      run({
        item: record.it,
        signal: makeSignal(),
        attributes,
        messageApi,
        setAttrItems,
        showModal,
      });
    };
  } else if (action.href && !action.widget) {
    props.href =
      typeof action.href === "function" ? action.href(record.it) : action.href;
    props.target = action.target ?? "_self";
    props.rel = action.target === "_blank" ? "noopener noreferrer" : undefined;
  }

  const source = (
    <>
      {modalHolder}
      {messageHolder}
      <ActionBtn key={action.key} {...props} />
    </>
  );

  if (action.widget) {
    const LazyWidget = action.widget;

    return (
      <>
        <Suspense key={action.key} fallback={source}>
          <LazyWidget
            source={source}
            {...(action.props ?? {})}
            label={action.label}
            icon={action.icon}
            setAttrItems={setAttrItems}
            item={record.it}
          />
        </Suspense>
      </>
    );
  }
  return source;
}

function ActionsDropdown({
  record,
  actions,
  attributes,
  setAttrItems,
}: {
  record: ChildrenResource;
  actions: RenderResourceAction[];
  attributes: [...typeof DefaultResourceSectionAttrs];
  setAttrItems: RenderActionsProps["setAttrItems"];
}) {
  const menuItems = useMemo<MenuProps["items"]>(() => {
    const map = new Map<ResourceActionGroupId, RenderResourceAction[]>();

    for (const a of actions) {
      const g = a.menu?.group;
      if (!g) continue;
      const arr = map.get(g) ?? [];
      arr.push(a);
      map.set(g, arr);
    }

    const items: NonNullable<MenuProps["items"]> = [];

    const groups = resourceActionGroups();

    for (const { key: g, label } of groups) {
      const children = (map.get(g) ?? []).sort(byMenuOrder).map((a) => ({
        key: a.key,
        label: (
          <RenderAction
            action={{
              ...a,
              props: { ...(a.props ?? {}), showLabel: true },
            }}
            attributes={attributes}
            record={record}
            setAttrItems={setAttrItems}
          />
        ),
      }));

      if (!children.length) continue;

      items.push({
        type: "group",
        key: g,
        label: label ?? getResourceActionGroup(g)?.label ?? g,
        children,
      });
    }

    return items;
  }, [actions, attributes, record, setAttrItems]);

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{ items: menuItems }}
    >
      <span onClick={(e) => e.stopPropagation()}>
        <ActionBtn size="small" showLabel={false} icon={<MoreVertIcon />} />
      </span>
    </Dropdown>
  );
}

export const RenderActions = memo(
  ({ record, attributes, setAttrItems }: RenderActionsProps) => {
    const [importantActions, extraActions] = useMemo(() => {
      const reg = registry.queryAll() as RenderResourceAction[];
      const quickAccess: RenderResourceAction[] = [];
      const extra: RenderResourceAction[] = [];

      for (const a of reg) {
        if (a.condition && !a.condition(record.it)) continue;
        if (a.quick) {
          quickAccess.push(a);
        } else {
          extra.push(a);
        }
      }

      quickAccess.sort(byQuickOrder);
      return [quickAccess, extra];
    }, [record]);

    return (
      <div className="container">
        {importantActions.map((action) => (
          <RenderAction
            key={action.key}
            attributes={attributes}
            action={action}
            record={record}
            setAttrItems={setAttrItems}
          />
        ))}
        {extraActions.length > 0 && (
          <ActionsDropdown
            attributes={attributes}
            actions={extraActions}
            record={record}
            setAttrItems={setAttrItems}
          />
        )}
      </div>
    );
  },
  (prev, next) => prev.record.resourceId === next.record.resourceId
);

RenderActions.displayName = "RenderActions";
