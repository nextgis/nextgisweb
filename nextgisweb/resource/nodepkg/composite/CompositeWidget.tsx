import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Dropdown, Spin, Tabs } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { SaveButton, TabsLabelBadge } from "@nextgisweb/gui/component";
import { ErrorModal, errorModal } from "@nextgisweb/gui/error";
import { useThemeVariables, useUnsavedChanges } from "@nextgisweb/gui/hook";
import { EditIcon } from "@nextgisweb/gui/icon";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ActiveOnOptions, EditorStore } from "../type";

import { CompositeStore } from "./CompositeStore";
import type { CompositeSetup } from "./CompositeStore";

import { LoadingOutlined } from "@ant-design/icons";

import "./CompositeWidget.less";

const msgCreate = gettext("Create");
const msgCreateEdit = gettext("Create and edit");
const msgSave = gettext("Save");
const msgSaving = gettext("Please wait. Processing request...");

type TabItem = NonNullable<TabsProps["items"]>[number] & {
    order?: number;
};

interface TabsLabelProps {
    composite: CompositeStore;
    member: EditorStore;
    title: string;
}

const TabsLabel = observer<TabsLabelProps>(({ composite, member, title }) => {
    return (
        <TabsLabelBadge
            error={composite.validate && !member.isValid}
            dirty={member.dirty}
            counter={member.counter}
        >
            {title}
        </TabsLabelBadge>
    );
});

TabsLabel.displayName = "TabsLabel";

export interface CompositeWidgetProps {
    setup: CompositeSetup;
}

const CompositeWidget = observer(({ setup }: CompositeWidgetProps) => {
    const [activeKey, setActiveKey] = useState<string>();
    const [composite] = useState(() => new CompositeStore({ setup }));
    const [redirecting, setRedirecting] = useState(false);

    const { operation } = setup;
    const { members, dirty } = composite;
    const { disable: disableUnsavedChanges } = useUnsavedChanges({ dirty });

    const items = useMemo<TabItem[]>(() => {
        if (!members) return [];
        return members
            .map(({ store, key, widget: Widget }) => {
                const tab: TabItem = {
                    key,
                    order: Widget.order,
                    label: (
                        <TabsLabel
                            composite={composite}
                            member={store}
                            title={Widget.title!}
                        />
                    ),
                    children: <Widget store={store} />,
                };
                return tab;
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [composite, members]);

    useEffect(() => {
        const selected = members?.find((member) => {
            const activateOn: ActiveOnOptions = member.widget.activateOn || {};
            if (activateOn[operation]) {
                return true;
            }
        });
        if (selected) {
            setActiveKey(selected.key);
        }
    }, [members, operation]);

    useEffect(() => {
        composite.init().catch();
    }, [composite]);

    const submit = useCallback(
        async (edit: boolean = false) => {
            setRedirecting(true);

            let id;
            try {
                ({ id } = await composite.submit());
            } catch (err) {
                setRedirecting(false);
                errorModal(err);
                return;
            }

            disableUnsavedChanges();
            const routeName = edit ? "resource.update" : "resource.show";
            window.location.href = route(routeName, { id }).url();
        },
        [composite, disableUnsavedChanges]
    );

    const inProgress = composite.loading || composite.saving || redirecting;

    const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
        const actions: ActionToolbarAction[] = [];

        if (operation === "create") {
            actions.push(
                <Dropdown.Button
                    key="create"
                    type="primary"
                    menu={{
                        items: [
                            {
                                key: "create_edit",
                                label: msgCreateEdit,
                                icon: <EditIcon />,
                                onClick: () => submit(true),
                            },
                        ],
                    }}
                    disabled={inProgress}
                    onClick={() => submit(false)}
                >
                    {msgCreate}
                </Dropdown.Button>
            );
        } else if (operation === "update") {
            actions.push(
                <SaveButton
                    key="save"
                    disabled={inProgress}
                    onClick={() => submit(false)}
                >
                    {msgSave}
                </SaveButton>
            );
        }
        return { actions };
    }, [inProgress, operation, submit]);

    const themeVariables = useThemeVariables({
        "color-border-secondary": "colorBorderSecondary",
        "border-radius": "borderRadius",
    });

    if (composite.error) {
        return <ErrorModal error={composite.error}></ErrorModal>;
    }

    return (
        <div className="ngw-resource-composite" style={themeVariables}>
            <div
                style={{ display: inProgress ? undefined : "none" }}
                className="spin"
            >
                <Spin
                    size="large"
                    indicator={<LoadingOutlined spin />}
                    tip={composite.saving || redirecting ? msgSaving : ""}
                >
                    <div />
                </Spin>
            </div>
            <Tabs
                style={{ display: inProgress ? "none" : undefined }}
                size="large"
                type="card"
                activeKey={activeKey}
                onChange={setActiveKey}
                items={items}
                parentHeight
            />

            <ActionToolbar {...toolbarProps} />
        </div>
    );
});

CompositeWidget.displayName = "CompositeWidget";

export default CompositeWidget;
