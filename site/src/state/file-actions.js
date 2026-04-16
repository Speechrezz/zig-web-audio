/**
 * @param {string} filename 
 * @param {string} text 
 */
export function downloadJsonFile(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

/**
 * Opens a file picker and reads the selected text file.
 * @returns {Promise<string|null>}
 */
export async function pickTextFile() {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.json,text/plain,application/json";
        input.style.display = "none";

        input.addEventListener("change", async () => {
            try {
                const file = input.files?.[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                const text = await file.text();
                resolve(text);
            } catch (err) {
                reject(err);
            } finally {
                input.remove();
            }
        });

        document.body.appendChild(input);
        input.click();
    });
}