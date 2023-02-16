import { FileUploader } from "../file-uploader";
import { ImageUploader } from "../image-uploader";

export function UploaderTest() {
    return (
        <>
            <h4>File uploader</h4>
            <FileUploader></FileUploader>
            <h4>Image uploader</h4>
            <ImageUploader></ImageUploader>
        </>
    );
}
