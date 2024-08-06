import { AutoComplete, Input, Spin } from "../antd";
import type { AutoCompleteProps } from "../antd";

import { LoadingOutlined } from "@ant-design/icons";

export interface AutoCompleteInputProps extends AutoCompleteProps {
    loading?: boolean;
}

const spinner = <Spin indicator={<LoadingOutlined spin />} size="small" />;

export function AutoCompleteInput({
    loading,
    ...props
}: AutoCompleteInputProps) {
    return (
        <AutoComplete {...props}>
            <Input suffix={loading ? spinner : <span />} />
        </AutoComplete>
    );
}
