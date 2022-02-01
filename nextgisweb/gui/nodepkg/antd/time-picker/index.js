import * as React from "react";
import DatePicker from "../date-picker";

const TimePicker = React.forwardRef((props, ref) => {
  return <DatePicker {...props} picker="time" mode={undefined} ref={ref} />;
});

TimePicker.displayName = "TimePicker";

export default TimePicker;
