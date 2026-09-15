function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return (
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")},` +
        `${String(milliseconds).padStart(3, "0")}`
    );
}

export function createSrt(captions) {
    if (!Array.isArray(captions)) {
        throw new Error("Captions must be an array.");
    }

    return captions
        .map((caption, index) =>
            [
                index + 1,
                `${formatTime(caption.start)} --> ${formatTime(caption.end)}`,
                caption.text,
                "",
            ].join("\n"),
        )
        .join("\n");
}
