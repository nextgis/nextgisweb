import { Spin } from "../antd";

import { LoadingOutlined } from "@ant-design/icons";

export function CentralLoading() {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
            }}
        >
            <Spin
                indicator={
                    <LoadingOutlined
                        style={{ fontSize: 24, color: "white" }}
                        spin={true}
                    />
                }
            />
        </div>
    );
}
