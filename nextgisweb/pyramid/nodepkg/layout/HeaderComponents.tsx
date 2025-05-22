import { observer } from "mobx-react-lite";

import { layoutStore } from "./store";

export const HeaderComponents = observer(() => {
    return layoutStore.headerComponents.map((Component, index) => (
        <div key={index}>{Component}</div>
    ));
});

HeaderComponents.displayName = "HeaderComponents";
