import { Button } from "./button.js";
import { PopupMenu } from "./popup-menu.js";

export class ComboBox extends Button {
    /** @type {PopupMenu} */
    popupMenu = new PopupMenu;

    /**
     * @param {string} name 
     */
    constructor(name) {
        super(name);

        this.popupMenu.addComponentToGroup(this);
    }

    toggleMenu() {
        if (this.popupMenu.isOpen())
            this.popupMenu.hideMenu();
        else
            this.popupMenu.showMenuAtComponent(this);
    }

    /** @param {MouseEvent} ev */
    mouseDown(ev) {
        super.mouseDown(ev);
        this.toggleMenu();
    }
}