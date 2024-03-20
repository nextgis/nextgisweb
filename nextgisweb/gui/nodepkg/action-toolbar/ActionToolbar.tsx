import {
    Fragment,
    forwardRef,
    isValidElement,
    useCallback,
    useMemo,
    useRef,
} from "react";
import type { ForwardedRef, ReactElement, Ref } from "react";

import { useFit } from "../hook/useFit";

import { useActionToolbar } from "./hook/useActionToolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
    CreateButtonActionOptions,
} from "./type";

import "./ActionToolbar.less";

function ActionToolbarInput<
    P extends Record<string, unknown> = Record<string, unknown>,
>(
    {
        size,
        style,
        actions = [],
        rightActions = [],
        actionProps,
        children,
    }: ActionToolbarProps<P>,
    ref: ForwardedRef<HTMLDivElement>
) {
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const isFit = useFit({
        ref: toolbarRef,
        deps: [actions, rightActions, children],
    });

    const { createButtonAction } = useActionToolbar({
        size,
        props: actionProps,
        isFit,
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
                return (
                    <ActionComponent
                        size={size}
                        isFit={isFit}
                        {...actionProps}
                    />
                );
            }

            if (action && typeof action === "object") {
                return createButtonAction(action as CreateButtonActionOptions);
            }

            return null;
        },
        [actionProps, createButtonAction, isFit, size]
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
        <div
            ref={(node) => {
                toolbarRef.current = node;
                if (typeof ref === "function") {
                    ref(node);
                } else if (ref) {
                    ref.current = node;
                }
            }}
            className="action-toolbar"
            style={style}
        >
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

type ActionToolbarType = <
    P extends Record<string, unknown> = Record<string, unknown>,
>(
    p: P & { ref?: Ref<HTMLDivElement> }
) => ReactElement;

export const ActionToolbar = forwardRef(
    ActionToolbarInput
) as ActionToolbarType;
