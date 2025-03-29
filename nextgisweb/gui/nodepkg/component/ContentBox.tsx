import classNames from "classnames";
import { forwardRef } from "react";

import "./ContentBox.less";

export interface ContentBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

/** @deprecated Use ContentCard instead */
const ContentBox = forwardRef<HTMLDivElement, ContentBoxProps>(
    ({ children, className, ...restProps }, ref) => {
        return (
            <div
                ref={ref}
                className={classNames("content-box", className)}
                {...restProps}
            >
                {children}
            </div>
        );
    }
);

ContentBox.displayName = "ContentBox";

export { ContentBox };
