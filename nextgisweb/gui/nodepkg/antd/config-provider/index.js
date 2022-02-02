import { forwardRef } from "react";
import Original from "antd/es/config-provider";
import locale from "@nextgisweb/jsrealm/locale-loader!";

const ConfigProvider = forwardRef((props, ref) => {
    return (
        <Original {...props} locale={locale.antd} ref={ref} />
    );
});

ConfigProvider.displayName = "ConfigProvider";

export default ConfigProvider;
