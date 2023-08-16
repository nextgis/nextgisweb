import { Skeleton } from "@nextgisweb/gui/antd";

type SkeletonProps = Parameters<typeof Skeleton>[0];

export interface LoadingWrapperProps extends SkeletonProps {
    /** Shortcut for rows in {@link SkeletonProps.paragraph} property */
    rows?: number;
    content?: string;
}

export function LoadingWrapper({
    children,
    content,
    loading = true,
    rows = 4,
    ...skeletonProps
}: LoadingWrapperProps) {
    if (loading) {
        return <Skeleton paragraph={{ rows }} {...skeletonProps} />;
    }
    children = children || content;
    return <>{children}</>;
}
