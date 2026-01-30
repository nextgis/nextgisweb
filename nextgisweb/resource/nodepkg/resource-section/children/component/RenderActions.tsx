import { Suspense, memo, useMemo } from "react";

import { registry } from "../../registry";
import type { ResourceAction } from "../../registry";
import type { ChildrenResource } from "../type";

import { ActionBtn } from "./ActionBtn";
import type { ActionBtnProps } from "./ActionBtn";

interface RenderActionsProps {
    record: ChildrenResource;
    setTableItems: React.Dispatch<React.SetStateAction<ChildrenResource[]>>;
}

function byOrder(a: ResourceAction, b: ResourceAction) {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    return bo - ao;
}

function RenderActionsComp({ record, setTableItems }: RenderActionsProps) {
    const actions = useMemo(() => {
        const reg = registry.queryAll() as ResourceAction[];
        const out: ResourceAction[] = [];

        for (const a of reg) {
            if (a.showInActionColumn === false) continue;
            if (a.condition && !a.condition(record)) continue;
            out.push(a);
        }

        out.sort(byOrder);
        return out;
    }, [record]);

    return (
        <>
            {actions.map((action) => {
                const props: ActionBtnProps = {
                    size: "small",
                    label: action.label,
                    icon: action.icon,
                    showLabel: false,
                    onClick: () => action.onClick?.(record),
                    ...(action.props ?? {}),
                };

                if (action.href) {
                    props.href =
                        typeof action.href === "function"
                            ? action.href(record)
                            : action.href;
                    props.target = action.target ?? "_self";
                    props.rel =
                        action.target === "_blank"
                            ? "noopener noreferrer"
                            : undefined;
                }
                const target = <ActionBtn key={action.key} {...props} />;
                if (action.widget) {
                    const LazyWidget = action.widget;

                    return (
                        <Suspense key={action.key} fallback={target}>
                            <LazyWidget
                                target={target}
                                {...(action.props ?? {})}
                                label={action.label}
                                icon={action.icon}
                                {...record}
                                setTableItems={setTableItems}
                            />
                        </Suspense>
                    );
                }

                return target;
            })}
        </>
    );
}

export const RenderActions = memo(
    RenderActionsComp,
    (prev, next) => prev.record.id === next.record.id
);
