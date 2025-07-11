import classNames from "classnames";
import { Fragment, isValidElement, useCallback, useMemo, useRef } from "react";
import type { Ref } from "react";

import { useToken } from "../antd";
import { useFit } from "../hook/useFit";
import { mergeStyles } from "../util";

import { useActionToolbar } from "./hook/useActionToolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
    CreateButtonActionOptions,
} from "./type";

import "./ActionToolbar.less";

export function ActionToolbar<
    P extends Record<string, any> = Record<string, any>,
>({
    ref,
    size,
    style,
    pad = false,
    borderBlockStart = false,
    borderBlockEnd = false,
    actions = [],
    rightActions = [],
    actionProps,
    children,
}: ActionToolbarProps<P> & { ref?: Ref<HTMLDivElement> }) {
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

    const { token } = useToken();
    const border = `1px solid ${token.colorSplit}`;

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
            className={classNames("ngw-gui-action-toolbar", "action-toolbar")}
            style={mergeStyles(
                pad && { padding: token.paddingSM },
                borderBlockStart && { borderBlockStart: border },
                borderBlockEnd && { borderBlockEnd: border },
                style
            )}
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
