import "./PanelContentContainer.less";

export function PanelContentContainer({
    fill,
    title,
    content,
    children,
    noMarginX,
    marginAll,
    contentClassName,
}: {
    fill?: React.ReactNode;
    title?: React.ReactNode;
    content?: React.ReactNode;
    children?: React.ReactNode;
    noMarginX?: boolean;
    marginAll?: boolean;
    contentClassName?: string;
}) {
    return (
        <div
            className={`panel-content-container${noMarginX ? " no-margin-x" : ""}${marginAll ? " margin-all" : ""}`}
        >
            {children ? (
                children
            ) : (
                <>
                    {title && (
                        <div className="fill">
                            <h3>{title}</h3>
                        </div>
                    )}
                    {fill && <div className="fill">{fill}</div>}
                    {content && (
                        <div
                            className={`content${contentClassName ? ` ${contentClassName}` : ""}`}
                        >
                            {content}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
