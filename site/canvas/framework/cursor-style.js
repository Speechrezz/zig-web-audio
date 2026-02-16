/**
 * @readonly
 * @enum {string}
 */
export const CursorStyle = Object.freeze({
    normal: "auto",
    pointer: "pointer",
    crosshair: "crosshair",
    text: "text",
    copy: "copy",
    move: "move",
    notAllowed: "not-allowed",
    grab: "grab",
    grabbing: "grabbing",
    resizeEW: "ew-resize",
    resizeNS: "resize-ns",
});

/**
 * @param {CursorStyle} mouseStyle 
 */
export function setCursorStyle(mouseStyle) {
    document.documentElement.style.cursor = mouseStyle;
}