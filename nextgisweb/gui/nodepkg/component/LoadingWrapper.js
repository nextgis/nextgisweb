import { Skeleton } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";

export function LoadingWrapper({
    loading=true,
    children,
    rows = 4,
    content,
    ...skeletonProps
}) {
    if (loading) {
        return <Skeleton paragraph={{ rows }} {...skeletonProps} />;
    }
    children = children || content;
    return <>{typeof children === "function" ? children() : children}</>;
}

LoadingWrapper.propTypes = {
    loading: PropTypes.bool,
    children: PropTypes.any,
    rows: PropTypes.number,
    content: PropTypes.func,
};
