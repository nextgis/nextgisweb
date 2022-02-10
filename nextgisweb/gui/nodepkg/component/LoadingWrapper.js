import { Skeleton } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";

export function LoadingWrapper({ loading, children, ...skeletonProps }) {
    if (loading) {
        return <Skeleton paragraph={{ rows: 4 }} {...skeletonProps} />;
    }
    return <>{children}</>;
}

LoadingWrapper.propTypes = {
    loading: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
};
