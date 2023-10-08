import {
    Fragment,
    forwardRef,
    isValidElement,
    useCallback,
    useMemo,
} from "react";
import type { ReactElement, Ref } from "react";

import { useActionToolbar } from "./hook/useActionToolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
    CreateButtonActionOptions,
} from "./type";

import "./ActionToolbar.less";

function ActionToolbarInput<
    P extends Record<string, any> = Record<string, any>,
>(
    {
        size,
        style,
        actions = [],
        rightActions = [],
        actionProps,
        children,
    }: ActionToolbarProps<P>,
    ref: Ref<HTMLDivElement>
) {
    const { createButtonAction } = useActionToolbar({
        size,
        props: actionProps,
    });

    const getAction = useCallback(
        (action: ActionToolbarAction<P>): React.ReactElement | null => {
            if (isValidElement(action)) {
                return action;
            }

            if (typeof action === "function") {
                const ActionComponent = action as React.ComponentType<
                    Record<string, unknown>
                >;
                return <ActionComponent {...{ size, ...actionProps }} />;
            }

            if (action && typeof action === "object") {
                return createButtonAction(action as CreateButtonActionOptions);
            }

            return null;
        },
        [actionProps, createButtonAction, size]
    );

    const [leftActions_, rightActions_] = useMemo(() => {
        const leftActionsList: React.ReactElement[] = [];

        const rightActionsList: React.ReactElement[] = [];

        for (const rightAction of rightActions) {
            const a = getAction(rightAction);
            if (a) {
                rightActionsList.push(a);
            }
        }

        let addDirection = leftActionsList;
        for (const action of actions) {
            if (typeof action === "string") {
                addDirection = rightActionsList;
                continue;
            }
            const actionElement = getAction(action);
            if (actionElement) {
                addDirection.push(actionElement);
            }
        }

        return [leftActionsList, rightActionsList];
    }, [actions, getAction, rightActions]);

    return (
        <div ref={ref} className="action-toolbar" style={style}>
            {leftActions_.map((action, index) => (
                <Fragment key={index}>{action}</Fragment>
            ))}

            <div className="spacer" />

            {rightActions_.map((action, index) => (
                <Fragment key={index}>{action}</Fragment>
            ))}

            {children}
        </div>
    );
}

export const ActionToolbar = forwardRef(ActionToolbarInput) as <
    P extends Record<string, any> = Record<string, any>,
>(
    p: ActionToolbarProps<P> & { ref?: Ref<HTMLDivElement> }
) => ReactElement;
