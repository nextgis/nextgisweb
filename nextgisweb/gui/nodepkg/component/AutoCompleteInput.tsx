import { AutoComplete, Input, Spin } from "../antd";
import type { AutoCompleteProps } from "../antd";

export interface AutoCompleteInputProps extends AutoCompleteProps {
    loading?: boolean;
}

const spinner = <Spin size="small" />;

export function AutoCompleteInput({
    loading,
    status,
    ...props
}: AutoCompleteInputProps) {
    return (
        <AutoComplete {...props}>
            <Input suffix={loading ? spinner : <span />} status={status} />
        </AutoComplete>
    );
}
