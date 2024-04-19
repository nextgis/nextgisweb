import { forwardRef } from "react";

import "./ContentBox.less";

export interface ContentBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

const ContentBox = forwardRef<HTMLDivElement, ContentBoxProps>(
    ({ children, ...restProps }, ref) => {
        return (
            <div {...restProps} className="content-box" ref={ref}>
                {children}
            </div>
        );
    }
);

ContentBox.displayName = "ContentBox";

export { ContentBox };
