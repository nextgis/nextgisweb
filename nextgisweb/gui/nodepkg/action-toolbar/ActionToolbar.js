import { PropTypes } from "prop-types";

import { forwardRef } from "react";

import { useActionToolbar } from "./hook/useActionToolbar";

import "./ActionToolbar.less";

export const ActionToolbar = forwardRef(function ActionToolbar(
    { size, style, actions, rightActions = [], actionProps, children },
    ref
) {
    const { createButtonAction } = useActionToolbar({
        size,
        props: actionProps,
    });

    let i = 0;
    const getAction = (Action) => (
        <div key={i++}>
            {typeof Action === "function" ? (
                <Action {...{ size, ...actionProps }} />
            ) : (
                createButtonAction(Action)
            )}
        </div>
    );

    const leftActions_ = [];
    const rightActions_ = [
        ...rightActions.map((rightAction) => getAction(rightAction)),
    ];

    let addDirection = leftActions_;
    for (const Action of [...actions]) {
        if (typeof Action === "string") {
            addDirection = rightActions_;
            continue;
        }
        addDirection.push(getAction(Action));
    }

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
