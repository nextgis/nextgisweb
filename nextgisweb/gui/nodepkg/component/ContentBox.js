export function ContentBox({ children, ...restProps }) {
    return (
        <div className="content-box" {...restProps}>
            {children}
        </div>
    );
}
