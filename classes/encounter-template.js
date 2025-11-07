import { MonksEnhancedJournal } from "../monks-enhanced-journal.js";

/**
 * A helper class for building MeasuredTemplates for deploying an Encounter
 */
export class EncounterTemplate extends foundry.canvas.placeables.MeasuredTemplate {

    /**
     * Track the timestamp when the last mouse move event was captured.
     * @type {number}
     */
    #moveTime = 0;

    /* -------------------------------------------- */

    /**
     * The initially active CanvasLayer to re-activate after the workflow is complete.
     * @type {CanvasLayer}
     */
    #initialLayer;

    /* -------------------------------------------- */

    /**
     * Track the bound event handlers so they can be properly canceled later.
     * @type {object}
     */
    #events;

    #stage = 0;

    /* -------------------------------------------- */

    get isVisible() {
        return game.user.isGM;
    }

    get id() {
        return this.#stage > 0;
    }

    /*
    #createControlIcon() {
        const size = Math.max(Math.round((canvas.dimensions.size * 0.5) / 20) * 20, 40);
        let icon = new ControlIcon({ texture: CONFIG.controlIcons.combat, size: size });
        icon.x -= (size * 0.5);
        icon.y -= (size * 0.5);
        return icon;
    }
    */

    static fromEncounter(encounter) {
        // Prepare template data
        const templateData = {
            t: "circle",
            user: game.user.id,
            distance: 5,
            direction: 0,
            x: 0,
            y: 0,
            fillColor: game.user.color,
            flags: { "monks-enhanced-journal": { encounter: encounter } }
        };

        // Return the template constructed from the item data
        const cls = CONFIG.MeasuredTemplate.documentClass;
        const template = new cls(templateData, { parent: canvas.scene });
        const object = new this(template);
        object.encounter = encounter;
        return object;
    }

    static getSnappedPosition(x, y, interval = 1) {
        if (interval === 0) return { x: Math.round(x), y: Math.round(y) };
        let x0 = x.toNearest(canvas.grid.size);
        let y0 = y.toNearest(canvas.grid.size);
        let dx = 0;
        let dy = 0;
        if (interval !== 1) {
            let delta = canvas.grid.size / interval;
            dx = Math.round((x - x0) / delta) * delta;
            dy = Math.round((y - y0) / delta) * delta;
        }
        return {
            x: Math.round(x0 + dx),
            y: Math.round(y0 + dy)
        };
    }

    /* -------------------------------------------- */
    async _draw(options) {
        await super._draw(options);

        this.controlIcon.iconSrc = "icons/svg/sword.svg";
        this.controlIcon.texture = null;
        await this.controlIcon.draw();
    }

    /**
     * Creates a preview of the spell template.
     * @returns {Promise}  A promise that resolves with the final measured template if created.
     */
    drawPreview() {
        const initialLayer = canvas.activeLayer;

        // Draw the template and switch to the template layer
        this.draw();
        this.layer.activate();
        this.layer.preview.addChild(this);
        this.layer.encounterTemplate = this;

        // Hide the sheet that originated the preview
        MonksEnhancedJournal.journal?.minimize();

        // Activate interactivity
        return this.activatePreviewListeners(initialLayer);
    }

    /* -------------------------------------------- */

    /**
     * Activate listeners for the template preview
     * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
     * @returns {Promise}                 A promise that resolves with the final measured template if created.
     */
    activatePreviewListeners(initialLayer) {
        return new Promise((resolve, reject) => {
            this.#initialLayer = initialLayer;
            this.#events = {
                cancel: this._onCancelPlacement.bind(this),
                confirm: this._onConfirmPlacement.bind(this),
                position: this._onSetPlacement.bind(this),
                move: this._onMovePlacement.bind(this),
                size: this._onSizePlacement.bind(this),
                dragstart: this._onDragStart.bind(this),
                resolve,
                reject
            };

            // Activate listeners
            canvas.stage.on("pointerdown", this.#events.position);
            canvas.stage.on("pointermove", this.#events.move);
            canvas.stage.on("pointerup", this.#events.confirm);
            canvas.app.view.oncontextmenu = this.#events.cancel;
        });
    }

    /* -------------------------------------------- */

    /**
     * Move the template preview when the mouse moves.
     * @param {Event} event  Triggering mouse event.
     */

    _onMovePlacement(event) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        let now = Date.now(); // Apply a 20ms throttle
        if (now - this.#moveTime <= 20) return;
        const center = event.data.getLocalPosition(this.layer);
        const snapped = EncounterTemplate.getSnappedPosition(center.x, center.y, 2);
        this.document.updateSource({ x: snapped.x, y: snapped.y });
        this.refresh();
        this.#moveTime = now;
    }

    async _onSetPlacement(event) {
        canvas.stage.off("pointermove", this.#events.move);
        canvas.stage.on("pointermove", this.#events.size);
        this.#stage = 1;
    }

    _onSizePlacement(event) {
        const { origin } = event.interactionData;
        event.stopPropagation();
        event.stopImmediatePropagation();

        event.data.createState = 0;

        const center = event.data.getLocalPosition(this.layer);
        const snapped = EncounterTemplate.getSnappedPosition(center.x, center.y, this.gridPrecision);

        // Compute the ray
        const ray = new foundry.canvas.geometry.Ray(origin, snapped);
        const ratio = (canvas.dimensions.size / canvas.dimensions.distance);

        // Update the preview object
        const direction = Math.normalizeDegrees(Math.toDegrees(ray.angle));
        const distance = ray.distance / ratio;
        this.document.updateSource({ direction, distance });
        this.refresh();
    }

    /* -------------------------------------------- */

    /**
 * Shared code for when template placement ends by being confirmed or canceled.
 * @param {Event} event  Triggering event that ended the placement.
 */
    async _finishPlacement(event) {
        this.layer._onDragLeftCancel(event);
        canvas.stage.off("pointermove", this.#events.move);
        canvas.stage.off("pointermove", this.#events.size);
        canvas.stage.off("pointerdown", this.#events.position);
        canvas.stage.off("pointerup", this.#events.confirm);
        canvas.app.view.oncontextmenu = null;
        delete this.layer.encounterTemplate;
        this.#initialLayer.activate();
        await MonksEnhancedJournal.journal?.maximize();
    }

    /**
     * Confirm placement when the left mouse button is clicked.
     * @param {Event} event  Triggering mouse event.
     */
    async _onConfirmPlacement(event) {
        await this._finishPlacement(event);
        const destination = EncounterTemplate.getSnappedPosition(this.document.x, this.document.y, 2);
        const distance = this.document.distance;

        this.#events.resolve({ x: destination.x, y: destination.y, distance: distance });
    }

    /* -------------------------------------------- */

    /**
     * Cancel placement when the right mouse button is clicked.
     * @param {Event} event  Triggering mouse event.
     */
    async _onCancelPlacement(event) {
        await this._finishPlacement(event);
        this.#events.reject();
    }

}
