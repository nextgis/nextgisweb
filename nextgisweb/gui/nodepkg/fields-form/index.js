import { Form } from "@nextgisweb/gui/antd";

import { FieldsForm } from "./FieldsForm";

// // Reexport shortcut
const useForm = Form.useForm;

import { BigInteger } from "./field/BigInteger";
import { Checkbox } from "./field/Checkbox";
import { DateInput } from "./field/DateInput";
import { DateTimeInput } from "./field/DateTimeInput";
import { Input } from "./field/Input";
import { Integer } from "./field/Integer";
import { KeynameTextBox } from "./field/KeynameTextBox";
import { LanguageSelect } from "./field/LanguageSelect";
import { Number } from "./field/Number";
import { Password } from "./field/Password";
import { Select } from "./field/Select";
import { TextArea } from "./field/TextArea";
import { TimeInput } from "./field/TimeInput";
import { ValidationTextBox } from "./field/ValidationTextBox";

export {
    BigInteger,
    Checkbox,
    DateInput,
    DateTimeInput,
    FieldsForm,
    Form,
    Input,
    Integer,
    KeynameTextBox,
    LanguageSelect,
    Number,
    Password,
    Select,
    TextArea,
    TimeInput,
    ValidationTextBox,
    useForm,
};
