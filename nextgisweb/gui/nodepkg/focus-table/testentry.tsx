/** @testentry react */

import { FocusTable } from "./FocusTable";
import type { GetItemFieldsFunction, TreeItemData } from "./type";

interface Data1 {
    title: string;
    checked: boolean;
    year: number;
}

const initValue: TreeItemData<Data1>[] = [
    { title: "foo", checked: false, year: 2024 },
    { title: "bar", checked: true, year: 2023 },
];

const getItemFields: GetItemFieldsFunction<Data1> = () => {
    return [
        { name: "title", label: "Title", widget: "input" },
        { name: "checked", label: "Checkbox", widget: "checkbox" },
        { name: "year", label: "Year", widget: "number" },
    ];
};

function FocusTableTest() {
    return (
        <FocusTable
            initValue={initValue}
            getItemFields={getItemFields}
            canDeleteItem={(item) => item.data.year === 2024}
            focus={{ form: { layout: "vertical" } }}
        />
    );
}

export default FocusTableTest;
