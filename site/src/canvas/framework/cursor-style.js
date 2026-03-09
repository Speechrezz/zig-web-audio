/**
 * @readonly
 * @enum {string}
 */
export const CursorStyle = Object.freeze({
    normal: "auto",
    none: "none",
    pointer: "pointer",
    crosshair: "crosshair",
    text: "text",
    copy: "copy",
    move: "move",
    notAllowed: "not-allowed",
    grab: "grab",
    grabbing: "grabbing",
    resizeEW: "ew-resize",
    resizeNS: "ns-resize",
});

/**
 * @param {CursorStyle} mouseStyle 
 */
export function setCursorStyle(mouseStyle) {
    document.documentElement.style.cursor = mouseStyle;
}