import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";
import generatePicker from "antd/es/date-picker/generatePicker";

const DatePicker = generatePicker(dayjsGenerateConfig);

export default DatePicker;
