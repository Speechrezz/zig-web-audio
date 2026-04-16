import { AppContext } from "../../../app/app-context.js";
import { processorDetails, ProcessorKind } from "../../../audio/audio-constants.js";
import { DawEvent } from "../../../daw/daw-constants.js";
import { Component } from "../../framework/component.js";
import { ComboBox } from "../../framework/components/combo-box.js";
import { MouseAction, MouseActionPolicy } from "../../framework/mouse-event.js";
import { Rectangle } from "../../framework/rectangle.js";
import { TrackControls } from "./track-controls.js";

export class TracksSection extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Rectangle} */
    headerBounds = new Rectangle;

    /** @type {Rectangle} */
    tracksBounds = new Rectangle;

    /** @type {ComboBox} */
    addInstrumentComboBox = new ComboBox("+");

    /** @type {TrackControls[]} */
    trackComponents = [];

    /** @type {ProcessorKind[]} */
    processorKindList = [];

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.addInstrumentComboBox.popupMenu.overrideWidth = 160;
        this.addChildComponent(this.addInstrumentComboBox);
        this.initializeDropdown();

        this.context.daw.addListener((ev, ctx) => this.dawEventCallback(ev, ctx));

        this.tracksChanged();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(98.5% 0.002 247.839)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "600 20px system-ui";
        ctx.fillText("Tracks", this.headerBounds.x + 8, this.headerBounds.getCenterY());
    }

    /**
     * Override to change mouse action handling policy
     * @param {MouseAction} mouseAction 
     * @returns MouseHandlePolicy
     */
    canHandleMouseAction(mouseAction) {
        switch (mouseAction) {
            case MouseAction.none:
            case MouseAction.primary:
                return MouseActionPolicy.acceptPropagate;
            default:
                return MouseActionPolicy.ignorePropagate;
        }
    }

    resized() {
        const bounds = this.getLocalBounds();
        this.headerBounds = bounds.removeFromTop(40);

        const addComboBoxBounds = this.headerBounds.reduced(8, 8).removeFromRight(24);
        this.addInstrumentComboBox.setBounds(addComboBoxBounds);

        this.tracksBounds = bounds;
        this.updateInstrumentBounds();
    }

    /**
     * @param {DawEvent} ev 
     * @param {any} ctx 
     */
    dawEventCallback(ev, ctx) {
        switch (ev) {
            case DawEvent.ProjectLoaded:
                this.tracksChanged();
                break;

            case DawEvent.TrackSelected:
                this.updateSelectedTrack();
                break;
            
            case DawEvent.TrackInserted:
            case DawEvent.TrackRemoved:
                this.tracksChanged();
                break;
        }
    }

    initializeDropdown() {
        const popupMenu = this.addInstrumentComboBox.popupMenu;
        for (const [kind, details] of Object.entries(processorDetails)) {
            this.processorKindList.push(kind);
            popupMenu.menuItems.push(details.name);
        }

        popupMenu.onSelectedChanged = (index) => this.instrumentDropdownItemClicked(index);
    }

    /**
     * @param {null | number} index 
     */
    instrumentDropdownItemClicked(index) {
        if (index === null) return;
        this.context.daw.addInstrument(-1, this.processorKindList[index]);
    }

    /**
     * @param {number} index 
     */
    instrumentClicked(index) {
        this.context.daw.selectTrack(index);
    }

    tracksChanged() {
        const tracks = this.context.daw.tracks;
        this.clearInstruments();

        for (const track of tracks) {
            const component = new TrackControls(track);
            component.onDelete = (index) => this.deleteInstrument(index);
            component.onClick = (index) => this.instrumentClicked(index);

            this.trackComponents.push(component);
            this.addChildComponent(component);
        }

        this.updateSelectedTrack();
        this.updateInstrumentBounds();
    }

    updateInstrumentBounds() {
        if (this.tracksBounds === null) return;
        
        const bounds = this.tracksBounds.reduced(8, 8);

        for (const component of this.trackComponents) {
            component.setBounds(bounds.removeFromTop(96));
            bounds.removeFromTop(8);
        }
    }

    updateSelectedTrack() {
        const selectedIndex = this.context.daw.selectedTrackIndex;

        for (const component of this.trackComponents) {
            const isSelected = component.track.index === selectedIndex;
            component.setSelected(isSelected);
        }
    }

    /**
     * @param {number} index 
     */
    deleteInstrument(index) {
        this.context.daw.removeTrack(index);
    }

    clearInstruments() {
        for (const component of this.trackComponents) {
            component.deinit();
            this.removeChildComponent(component);
        }

        this.trackComponents.length = 0;
    }
}