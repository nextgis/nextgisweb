import { observer } from "mobx-react-lite";
import { Suspense, lazy, useEffect, useRef, useState } from "react";

import { Avatar } from "./Avatar";
import { HeaderComponents } from "./HeaderComponents";
import { layoutStore } from "./store";

interface HeaderProps {
    title?: string;
    hideResourceFilter?: boolean;
    hideMenu?: boolean;
    returnUrl?: string;
    applicationUrl?: string;
}

const ResourcesFilter = lazy(
    () => import("@nextgisweb/resource/resources-filter")
);
const Menu = lazy(() => import("./Menu"));

export const Header = observer<HeaderProps>(
    ({
        title,
        hideResourceFilter = false,
        hideMenu = false,
        returnUrl,
        applicationUrl = ngwConfig.applicationUrl,
    }: HeaderProps) => {
        const hideMenuRef = useRef(hideMenu);
        const [logoElement] = useState<React.ReactNode>();
        // const { route } = useRoute("pyramid.csettings");

        useEffect(() => {
            layoutStore.setHideMenu(hideMenuRef.current);
            const getLogoElement = async () => {
                // const company_logo = pyramidSettings.company_logo;
                // const hlogo = `${routeURL("pyramid.asset.hlogo")}?ckey=${company_logo.ckey}`;
                // // console.log(hlogo);
                // // if (enabled) {
                // //     // const logo = await route("pyramid.static", {
                // //     // skey: ckey,
                // //     // }).get();
                // //     // console.log(logo);
                // // } else {
                // //     //
                // // }
                // setLogoElement(<img src={hlogo} />);
                // const logo = await route.get({
                //     query: {
                //         pyramid: ["header_logo"],
                //     },
                // });
                // console.log(company_logo, logo);
            };
            getLogoElement();
        }, []);

        return (
            <div className="ngw-pyramid-layout-header">
                <a href={returnUrl || applicationUrl}>{logoElement}</a>
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
