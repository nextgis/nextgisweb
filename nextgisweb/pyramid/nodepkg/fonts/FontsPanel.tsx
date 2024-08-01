import { List } from "@nextgisweb/gui/antd";

export function FontsPanel({ items }: { items: string[] }) {
    return (
        <div>
            <List
                dataSource={items}
                renderItem={(item) => <List.Item>{item}</List.Item>}
            />
        </div>
    );
}
