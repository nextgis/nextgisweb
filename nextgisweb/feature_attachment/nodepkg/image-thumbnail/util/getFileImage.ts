export function getFileImage(file: File) {
    return new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onloadend = function () {
            if (typeof fr.result === "string") {
                resolve(fr.result);
            } else {
                reject(new Error("unreachable"));
            }
        };
    });
}
