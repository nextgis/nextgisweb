import generatePicker from "antd/es/date-picker/generatePicker";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";

const DatePicker = generatePicker(dayjsGenerateConfig);
const { RangePicker } = DatePicker;

export default RangePicker;
