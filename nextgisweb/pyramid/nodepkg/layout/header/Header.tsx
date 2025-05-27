import { observer } from "mobx-react-lite";
import { Suspense, lazy, useEffect, useRef } from "react";

import { Avatar } from "../Avatar";
import { layoutStore } from "../store";

import { HeaderComponents } from "./HeaderComponents";
import HeaderLogo from "./HeaderLogo";

// NOTE: Header.less is imported in layout.less as it's used during bootstrapping
// import "./Header.less";

export interface HeaderProps {
    title?: string;
    hideResourceFilter?: boolean;
    hideMenu?: boolean;
}

const Menu = lazy(() => import("../Menu"));

export const Header = observer<HeaderProps>((props: HeaderProps) => {
    const { title, hideMenu = false } = props;
    const hideMenuRef = useRef(hideMenu);

    useEffect(() => {
        layoutStore.setHideMenu(hideMenuRef.current);
    }, []);

    return (
        <div className="ngw-pyramid-layout-header">
            <HeaderLogo />
            <div className="text">{title}</div>
            <div className="container">
                <HeaderComponents {...props} />

                <Avatar />

                {!layoutStore.hideMenu && (
                    <Suspense fallback={null}>
                        <Menu {...props} />
                    </Suspense>
                )}
            </div>
        </div>
    );
});

Header.displayName = "Header";
