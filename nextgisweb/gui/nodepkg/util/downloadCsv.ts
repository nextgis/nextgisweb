export function downloadCsv(
    csvContent: string,
    filename: string = "export.csv"
): void {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
}
