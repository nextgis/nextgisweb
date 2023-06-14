import { FileUploader, FileUploaderButton } from "../file-uploader";
import { ImageUploader } from "../image-uploader";

export function UploaderTest() {
    return (
        <>
            <h4>File uploader</h4>
            <FileUploader></FileUploader>
            <h4>Image uploader</h4>
            <ImageUploader></ImageUploader>
            <h4>Button uploader</h4>
            <FileUploaderButton></FileUploaderButton>
        </>
    );
}
