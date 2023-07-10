/** @testentry react */

import { Space } from "@nextgisweb/gui/antd";

import { PrincipalSelect } from "./PrincipalSelect";

function PrincipalSelectTest() {
    return (
        <Space direction="vertical">
            <div>
                <h4>
                    <p>Show users</p>
                    <code>{`<PrincipalSelect model="user" />`}</code>
                </h4>
                <div style={{ width: "800px" }}>
                    <PrincipalSelect multiple model="user" />
                </div>
            </div>
            <div>
                <h4>
                    <p>Include system users</p>
                    <code>{`<PrincipalSelect model="user" systemUsers />`}</code>
                </h4>
                <div style={{ width: "800px" }}>
                    <PrincipalSelect multiple model="user" systemUsers />
                </div>
            </div>
            <div>
                <h4>
                    <p>Include only &apos;guest&apos; system users</p>
                    <code>{`<PrincipalSelect model="user" systemUsers={['guest']} />`}</code>
                </h4>
                <div style={{ width: "800px" }}>
                    <PrincipalSelect
                        model="user"
                        multiple
                        systemUsers={["guest"]}
                    />
                </div>
            </div>
            <div>
                <h4>
                    <p>Show groups</p>
                    <code>{`<PrincipalSelect model="group" />`}</code>
                </h4>
                <div style={{ width: "800px" }}>
                    <PrincipalSelect multiple model="group" />
                </div>
            </div>
            <div>
                <h4>
                    <p>Show groups and local users (without system users)</p>
                    <code>{`<PrincipalSelect />`}</code>
                </h4>
                <div style={{ width: "800px" }}>
                    <PrincipalSelect multiple />
                </div>
            </div>
        </Space>
    );
}

export default PrincipalSelectTest;
