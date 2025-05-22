import { observer } from "mobx-react-lite";
import { Suspense, lazy, useEffect, useRef } from "react";

import { Avatar } from "./Avatar";
import { HeaderComponents } from "./HeaderComponents";
import HeaderLogo from "./HeaderLogo";
import { layoutStore } from "./store";

interface HeaderProps {
    title?: string;
    hideResourceFilter?: boolean;
    hideMenu?: boolean;
}

const ResourcesFilter = lazy(
    () => import("@nextgisweb/resource/resources-filter")
);
const Menu = lazy(() => import("./Menu"));

export const Header = observer<HeaderProps>(
    ({ title, hideResourceFilter = false, hideMenu = false }: HeaderProps) => {
        const hideMenuRef = useRef(hideMenu);

        useEffect(() => {
            layoutStore.setHideMenu(hideMenuRef.current);
        }, []);

        return (
            <div className="ngw-pyramid-layout-header">
                <HeaderLogo />
                <div className="text">{title}</div>
                <div className="container">
                    <div id="header-components">
                        <HeaderComponents />
                    </div>
                    {!hideResourceFilter && (
                        <div className="header-resources-filter">
                            <Suspense fallback={null}>
                                <ResourcesFilter
                                    onChange={(_value, option) => {
                                        window.location.href = option.url;
                                    }}
                                />
                            </Suspense>
                        </div>
                    )}
                    <div id="avatar">
                        <Avatar />
                    </div>
                    {!layoutStore.hideMenu && (
                        <div id="menu">
                            <Suspense fallback={null}>
                                <Menu />
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);
Header.displayName = "Header";
