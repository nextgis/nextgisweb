import { useThemeVariables } from "@nextgisweb/gui/hook";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

// NOTE: Breadcrumbs.less is imported in layout.less as it's used during bootstrapping
// import "./Breadcrumbs.less";

export interface BreadcrumbsProps {
    items: {
        link: string;
        label: string;
        icon: string | null;
    }[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    const themeVariables = useThemeVariables({
        "theme-color-link-active": "colorLinkActive",
        "theme-color-text-tertiary": "colorTextTertiary",
    });

    if (items.length === 0) return <></>;
    return (
        <div className="ngw-pyramid-layout-breadcrumbs" style={themeVariables}>
            {items.map(({ link, label, icon }, idx) => (
                <span key={idx}>
                    <a href={link}>
                        {icon && <SvgIcon icon={icon} />}
                        {label}
                    </a>
                </span>
            ))}
        </div>
    );
}
