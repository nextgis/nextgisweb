import { PropTypes } from "prop-types";

import { forwardRef, useCallback, useMemo, useRef, isValidElement  } from "react";

import { useActionToolbar } from "./hook/useActionToolbar";

import "./ActionToolbar.less";

export const ActionToolbar = forwardRef(function ActionToolbar(
    { size, style, actions, rightActions = [], actionProps, children },
    ref
) {
    const keyIndexRef = useRef(0);
    const { createButtonAction } = useActionToolbar({
        size,
        props: actionProps,
    });

    const getAction = useCallback(
        (Action) => {
            keyIndexRef.current = keyIndexRef.current + 1
            if (isValidElement(Action)) {
                return Action;
            } else {
                return (
                    <div key={keyIndexRef.current}>
                        {typeof Action === "function" ? (
                            <Action {...{ size, ...actionProps }} />
                        ) : (
                            createButtonAction(Action)
                        )}
                    </div>
                );
            }
        },

        [actionProps, createButtonAction, size]
    );

    const [leftActions_, rightActions_] = useMemo(() => {
        keyIndexRef.current = 0
        const leftActions__ = [];
        const rightActions__ = [
            ...rightActions.map((rightAction) => getAction(rightAction)),
        ];

        let addDirection = leftActions__;
        for (const Action of [...actions]) {
            if (typeof Action === "string") {
                addDirection = rightActions__;
                continue;
            }
            addDirection.push(getAction(Action));
        }
        return [leftActions__, rightActions__];
    }, [actions, getAction, rightActions]);

    return (
        <div ref={ref} className="action-toolbar" {...{ style }}>
            {leftActions_}

            <div className="spacer" />

            {rightActions_}

            {children}
        </div>
    );
});

ActionToolbar.propTypes = {
    size: PropTypes.string,
    actionProps: PropTypes.object,
    actions: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string,
            PropTypes.func,
        ])
    ),
    rightActions: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string,
            PropTypes.func,
        ])
    ),
    style: PropTypes.object,
    children: PropTypes.node,
};
