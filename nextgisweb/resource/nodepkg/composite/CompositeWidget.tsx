import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { TabLabel } from "@nextgisweb/feature-layer/feature-editor/component/TabLabel";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Tabs } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ParamOf } from "@nextgisweb/gui/type";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    ResourceCls,
    ResourceWidget,
} from "@nextgisweb/resource/type/api";

import type { ActiveOnOptions, Operation } from "../type";

import { CompositeStore } from "./CompositeStore";

import "./CompositeWidget.less";

export interface CompositeWidgetProps {
    cls?: ResourceCls;
    operation: Operation;
    parent?: number;
    id?: number;
}

type TabItem = NonNullable<ParamOf<typeof Tabs, "items">>[0] & {
    order?: number;
};

const operationMsg: Record<ResourceWidget["operation"], string> = {
    create: gettext("Create"),
    update: gettext("Save"),
    delete: gettext("Delete"),
    read: gettext("Read"),
};

function goToResource(id: number, edit = false) {
    if (edit) {
        window.location.href = route("resource.update", {
            id,
        }).url();
    } else {
        window.location.href = route("resource.show", {
            id,
        }).url();
    }
}

const CompositeWidget = observer(
    ({ cls, operation, parent, id }: CompositeWidgetProps) => {
        const [activeKey, setActiveKey] = useState<string>();
        const [composite] = useState(
            () => new CompositeStore({ cls, operation, parent, id })
        );
        const { isValid, members } = composite;

        const items = useMemo<TabItem[]>(() => {
            if (members) {
                return members
                    .map(({ store, widget: Widget }) => {
                        const ObserverTableLabel = observer(() => (
                            <TabLabel
                                isValid={store.isValid}
                                label={Widget.title}
                            />
                        ));
                        ObserverTableLabel.displayName = `ObserverTableLabel-${store.identity}`;

                        const tab: TabItem = {
                            key: store.identity,
                            order: Widget.order,
                            label: <ObserverTableLabel />,
                            children: <Widget store={store}></Widget>,
                        };
                        return tab;
                    })
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            }
            return [];
        }, [members]);

        useEffect(() => {
            const selected = members?.find((member) => {
                const activateOn: ActiveOnOptions =
                    member.widget.activateOn || {};
                if (activateOn[operation]) {
                    return true;
                }
            });
            if (selected) {
                setActiveKey(selected.store.identity);
            }
        }, [members, operation]);

        useEffect(() => {
            composite.init();
        }, [composite]);

        const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
            const actions: ActionToolbarAction[] = [
                <SaveButton
                    disabled={!isValid}
                    key="save"
                    loading={composite.saving}
                    onClick={async () => {
                        if (operation === "create") {
                            try {
                                const res = await composite.create();
                                if (res) {
                                    goToResource(res.id);
                                }
                            } catch (error) {
                                errorModal(error);
                            }
                        } else if (operation === "update") {
                            try {
                                await composite.update();
                                if (composite.id !== null) {
                                    goToResource(composite.id);
                                }
                            } catch (error) {
                                errorModal(error);
                            }
                        } else if (operation === "delete") {
                            try {
                                await composite.delete();
                                if (composite.parent !== null) {
                                    goToResource(composite.parent);
                                }
                            } catch (error) {
                                errorModal(error);
                            }
                        }
                    }}
                >
                    {operationMsg[operation]}
                </SaveButton>,
            ];
            const rightActions: ActionToolbarAction[] = [];

            return {
                actions,
                rightActions,
            };
        }, [composite, isValid, operation]);

        return (
            <div className="ngw-resource-composite">
                <Tabs
                    type="card"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={items}
                    parentHeight
                />
                <ActionToolbar {...toolbarProps} />
            </div>
        );
    }
);

CompositeWidget.displayName = "CompositeWidget";

export default CompositeWidget;
