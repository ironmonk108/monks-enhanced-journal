import { DCConfig } from "../apps/dc-config.js";
import { setting, i18n, format, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { EncounterTemplate } from "../classes/encounter-template.js";
import { getValue, setValue, MEJHelpers } from "../helpers.js";

export class EncounterSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.encounter",
            icon: "fa-solid fa-toolbox",
        },
        actions: {
            createCombat: EncounterSheet.onCreateCombat,
            createEncounter: EncounterSheet.onCreateEncounter,
            selectEncounter: EncounterSheet.onSelectEncounter,
            clickMonster: EncounterSheet.onClickMonster,
            deleteMonster: EncounterSheet.onDeleteMonster,
            rollMonster: EncounterSheet.onRollMonster,
            refillEncounterLoot: EncounterSheet.onRefillItems,
            refillItem: EncounterSheet.onRefillItem,
            rollItems: EncounterSheet.onRollLoot,
            assignEncounterLoot: EncounterSheet.onAssignItems,
            createDC: EncounterSheet.onCreateDC,
            editDC: EncounterSheet.onEditDC,
            deleteDC: EncounterSheet.onDeleteItem,
            rollDC: EncounterSheet.onRollDC,
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/encounter.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-monsters.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-encounter-items.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-dcs.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-notes.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-currency.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".editor-display",
                ".editor-content",
                ".monsters .items-list .item-list",
                ".items-list.encounter-items .item-list",
                ".items-list.encounter-dcs .item-list"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "monsters", icon: "fa-solid fa-skull" },
                { id: "loot", icon: "fa-solid fa-cart-flatbed" },
                { id: "dcs", icon: "fa-solid fa-scroll" },
                { id: "notes", icon: "fa-solid fa-paperclip" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    /*
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.sheettype.encounter"),
            template: "modules/monks-enhanced-journal/templates/sheets/encounter.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".encounter-container" },
                { dragSelector: ".document.item", dropSelector: ".encounter-container" },
                { dragSelector: ".encounter-monsters .item-list .item .item-image", dropSelector: "null" },
                { dragSelector: ".encounter-items .item-list .item .item-name", dropSelector: "null" },
                //{ dragSelector: ".create-encounter", dropSelector: "null" },
                //{ dragSelector: ".create-combat", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.description .tab-inner", ".encounter-content", ".encounter-items", ".encounter-dcs"]
        });
    }*/

    static get type() {
        return 'encounter';
    }

    static get defaultObject() {
        return { items: {}, actors: {}, dcs: {} };
    }

    _prepareTabs(group) {
        let tabs = super._prepareTabs(group);

        // Check if this system can use DCs
        if (!Object.keys(DCConfig.optionList()).length) {
            delete tabs.dcs;
        }

        if (!game.user.isGM) {
            // Remove tabs that the players shouldn't see
            delete tabs.monsters;
            delete tabs.loot;
            delete tabs.dcs;
        }

        return tabs;
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        context.actors = await this.getActors();

        context.dcs = await this.getDCs();

        context.groups = await this.getItemGroups();

        context.showLocation = game.modules.get("tagger")?.active && game.modules.get("monks-active-tiles")?.active;

        let currency = (context.data.flags['monks-enhanced-journal'].currency || []);
        context.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: currency[c.id] ?? 0 };
        });

        context.has = {
            monsters: Object.keys(context.actors || {})?.length > 0,
            items: Object.keys(context.groups || {})?.length > 0,
            dcs: foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.dcs")?.length > 0
        }

        context.canShow = {
            dcs: !!Object.keys(DCConfig.optionList()).length
        }

        context.placeholder = "MonksEnhancedJournal.Encounter";

        return context;
    }

    _documentControls() {
        let ctrls = [
            { label: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', label: i18n("MonksEnhancedJournal.SearchDescription"), visible: !!this.enhancedjournal, callback: this.searchText },
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'edit', label: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fas fa-pencil-alt', visible: this.isEditable, action: "editDescription" },
            { id: 'sound', label: i18n("MonksEnhancedJournal.AddSound"), icon: 'fas fa-music', visible: this.isEditable, action: "addSound" },
            { id: 'convert', label: i18n("MonksEnhancedJournal.Convert"), icon: 'fas fa-clipboard-list', visible: (game.user.isGM && this.isEditable), action: "convertSheet" }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    async getActors() {
        if (foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.monsters")) {
            await this.document.setFlag("monks-enhanced-journal", "actors", foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.monsters"));
            await this.document.unsetFlag("monks-enhanced-journal", "monsters");
        }

        let actors = this.document.flags["monks-enhanced-journal"].actors || {};
        if (actors instanceof Array) {
            let newActors = {};
            for (let actor of actors) {
                newActors[actor.id] = actor;
            }

            actors = newActors;
            await this.document.setFlag("monks-enhanced-journal", "actors", actors);
        }

        let results = [];
        for (let [itemId, item] of Object.entries(actors)) {
            let result = foundry.utils.duplicate(item);
            result.id = result.id || result._id || itemId;
            let actor = await EnhancedJournalSheet.getDocument(item);

            if (actor) {
                result.name = actor.name;
                result.img = actor.img;
            } else {
                result.failed = true;
                result.name = i18n("MonksEnhancedJournal.msg.CouldNotFindActor");
                result.img = "icons/svg/mystery-man.svg";
            }

            results.push(result);
        }

        // Sort the actors by failed last and then by name
        results = results.sort((a, b) => {
            if (a.failed && !b.failed) return 1;
            if (!a.failed && b.failed) return -1;
            return a.name.localeCompare(b.name);
        });
        return results;
    }

    _prepareSubmitData(event, form, formData, updateData) {
        let submitData = super._prepareSubmitData(event, form, formData, updateData);

        // Make sure to include all the actor data if you're updating data
        let actors = foundry.utils.mergeObject(foundry.utils.getProperty(submitData, "flags.monks-enhanced-journal.actors") || {}, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.actors") || {}, { overwrite: false });
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.actors", actors);

        // Make sure to include all the dc data if you're updating data
        let dcs = foundry.utils.mergeObject(foundry.utils.getProperty(submitData, "flags.monks-enhanced-journal.dcs") || {}, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.dcs") || {}, { overwrite: false });
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.dcs", dcs);

        return submitData;
    }

    _dragDrop(html) {
        super._dragDrop(html);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".monster-icon",
            dropSelector: "#board",
            permissions: {
                dragstart: this.document.isOwner
            },
            callbacks: {
                dragstart: this._onDragMonsterStart.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".monsters .items-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropMonster.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".encounter-items.items-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropEncounterItem.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".item-list .item-name",
            permissions: {
                dragstart: this._canDragItemStart.bind(this)
            },
            callbacks: {
                dragstart: this._onDragItemsStart.bind(this)
            }
        }).bind(html);

        //{ dragSelector: ".document.actor", dropSelector: ".encounter-container" }
    }

    _canDragItemStart(selector) {
        return game.user.isGM || this.document.isOwner;
    }

    _onDragItemsStart(event) {
        let li = event.target.closest('li');

        const dragData = { from: this.document.uuid };
        
        let type = li.dataset.document || li.dataset.type;
        let id = li.dataset.id;
        dragData.type = type;
        if (type == "Item") {
            let items = this.document.flags["monks-enhanced-journal"]?.items || {};
            let item = items[id];

            if (!game.user.isGM && (this.document.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }
            dragData.itemId = id;
            dragData.uuid = this.document.uuid;
            dragData.data = foundry.utils.duplicate(item);

            MonksEnhancedJournal._dragItem = id;
        } else if (type == "Actor") {
            let actors = this.document.flags["monks-enhanced-journal"]?.actors || {};
            let actor = actors[id];
            dragData.uuid = actor.uuid;
        }

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _onDrop(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Folder') {
            if (!this.document.isOwner)
                return false;
            // Import items from the folder
            let folder = await fromUuid(data.uuid);
            if (folder) {
                for (let item of folder.contents) {
                    if (item instanceof Item) {
                        let itemData = item.toObject();
                        await this.addItem({ data: itemData });
                    }
                }
            }
        }
        else if (data.type == 'Item') {
            if (data.from == this.document.uuid)  //don't drop on yourself
                return;
            if (data.groupSelect) {
                // remove the last 16 characters from the uuid to get the item uuid
                let itemId = data.uuid.substring(0, data.uuid.length - 16);
                for (let item of data.groupSelect) {
                    await this.addItem({ type: "Item", uuid: `${itemId}${item}` });
                }
                if (game.MultipleDocumentSelection)
                    game.MultipleDocumentSelection.clearAllTabs();
            } else
                this.addItem(data);
        }

        log('drop data', event, data);
    }

    /* Monsters ---------------------------------------------------*/

    async _onDragMonsterStart(event) {
        const target = event.currentTarget;

        const dragData = {
            uuid: target.closest("li.item").dataset.uuid,
            type: "Actor"
        };

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _onDropMonster(event) {
        const dragData = JSON.parse(event.dataTransfer.getData("text/plain"));
        if (dragData.type === "Actor") {
            if (dragData.groupSelect) {
                for (let actor of dragData.groupSelect) {
                    await this.addActor({ type: "Actor", uuid: `Actor.${actor}` });
                }
                if (game.MultipleDocumentSelection)
                    game.MultipleDocumentSelection.clearAllTabs();
            } else
                await this.addActor(dragData);
        }
        else if (data.type == 'Folder') {
            if (!this.document.isOwner)
                return false;
            // Import items from the folder
            let folder = await fromUuid(data.uuid);
            if (folder) {
                for (let actor of folder.contents) {
                    if (actor instanceof Actor) {
                        let actorData = actor.toObject();
                        await this.addActor({ data: actorData });
                    }
                }
            }
        }
    }

    async addActor(data) {
        let actor = await this.getItemData(data);

        if (actor) {
            let actors = foundry.utils.duplicate(this.document.getFlag("monks-enhanced-journal", "actors") || {});
            if (!Object.values(actors).find(a => a.uuid == actor.uuid)) {
                actors[actor.id || actor._id] = actor;
                await this.document.setFlag("monks-enhanced-journal", "actors", actors);
            } else {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ActorAlreadyInEncounter"));
            }
        }
    }

    static async onClickMonster(event, target) {
        let li = target.closest('.item');
        let uuid = li.dataset.uuid;
        let actor;
        if (uuid)
            actor = await fromUuid(uuid);
        else {
            let id = li.dataset.id;
            actor = game.actors.find(a => a.id == id);
        }
        if (!actor)
            return;

        actor.sheet.render(true);
    }

    static onDeleteMonster(event, target) {
        let li = target.closest('.item');
        let id = li.dataset.id;
        this.deleteItem(id, "actors");
    }

    static onSelectEncounter(event, target) {
        this.constructor.selectEncounter.call(this.document);
    }

    static selectEncounter() {
        let tokens = (this.flags['monks-enhanced-journal']?.tokens || []);

        if (tokens.length == 0) {
            return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.NoMonstersToSelect"));
        }

        canvas.tokens.activate();
        canvas.hud.note.close();
        canvas.tokens.releaseAll();
        for (let tokenid of tokens) {
            let token = canvas.tokens.get(tokenid);
            if (token)
                token.control({ releaseOthers: false });
        }
    }

    static onCreateEncounter(event, target) {
        this.constructor.startEncounter.call(this, false);
    }

    static onCreateCombat(event, target) {
        this.constructor.startEncounter.call(this, true);
    }

    static async startEncounter(combat) {
        if (Object.keys(foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.actors") || {}).length == 0) {
            return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.NoMonstersInEncounter"));
        }
        let template = await (EncounterTemplate.fromEncounter(this))?.drawPreview();
        if (template) {
            EncounterSheet.createEncounter.call(this.document, template, { combat });
        }
    }

    static async createEncounter(templates, options) {
        canvas.tokens.releaseAll();

        let folder = game.folders.find(f => f.name == "Encounter Monsters" && f.folder == undefined);
        if (!folder) {
            let folderData = {
                name: "Encounter Monsters",
                type: "Actor",
                sorting: "m",
                folder: null
            };
            folder = await Folder.create(folderData);
        }

        let tokens = [];
        for (let ea of Object.values(foundry.utils.getProperty(this, "flags.monks-enhanced-journal.actors") || {})) {
            let actor = await EnhancedJournalSheet.getDocument(ea);//Actor.implementation.fromDropData(ea);
            if (actor) {
                if (!actor.isOwner) {
                    return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveTokenPermissions", { actorname: actor.name }));
                }
                if (actor.compendium) {
                    const actorData = game.actors.fromCompendium(actor);
                    actorData.folder = folder;
                    actor = await Actor.implementation.create(actorData);
                }

                // Prepare the Token data
                let quantity = String(ea.quantity || "1");
                if (quantity.indexOf("d") != -1) {
                    let r = new Roll(quantity);
                    await r.evaluate({ async: true });
                    quantity = r.total;
                } else {
                    quantity = parseInt(quantity);
                    if (isNaN(quantity)) quantity = 1;
                }

                for (let i = 0; i < (quantity || 1); i++) {
                    let data = templates;
                    if (templates instanceof Array) data = templates[parseInt(Math.random() * templates.length)];
                    let template = foundry.utils.duplicate(data);

                    if (!(template instanceof foundry.canvas.placeables.MeasuredTemplate)) {
                        const cls = CONFIG.MeasuredTemplate.documentClass;
                        const doc = new cls(template, { parent: canvas.scene });
                        template = new foundry.canvas.placeables.MeasuredTemplate(doc);

                        let { x, y, direction, distance, angle, width } = template.document;
                        let d = canvas.dimensions;
                        //distance *= (d.size / d.distance);
                        width *= (d.size / d.distance);
                        direction = Math.toRadians(direction);

                        template.position.set(x, y);

                        // Create ray and bounding rectangle
                        template.ray = foundry.canvas.geometry.Ray.fromAngle(x, y, direction, distance);

                        switch (template.document.t) {
                            case "circle":
                                template.shape = template.constructor.getCircleShape(distance);
                                break;
                            case "cone":
                                template.shape = template.constructor.getConeShape(direction, angle, distance);
                                break;
                            case "rect":
                                template.shape = template.constructor.getRectShape(direction, distance);
                                break;
                            case "ray":
                                template.shape = template.constructor.getRayShape(direction, distance, width);
                        }
                    }

                    let newSpot = MonksEnhancedJournal.findVacantSpot(template, { width: actor.prototypeToken.width, height: actor.prototypeToken.height }, tokens, data.center || options.center);
                    let td = await actor.getTokenDocument({ x: newSpot.x, y: newSpot.y, hidden: ea.hidden });
                    //if (ea.hidden)
                    //    td.hidden = true;

                    tokens.push(td);

                    //let token = await cls.createDocuments([td], { parent: canvas.scene });
                    //if (ea.hidden)
                    //    token.update({ hidden: true });

                    //tokenids.push(token.id);
                }
            }
        }

        if (tokens.length) {
            let cls = getDocumentClass("Token");
            let results = await cls.createDocuments(tokens, { parent: canvas.scene });

            let tokenids = (this.flags['monks-enhanced-journal']?.tokens || []).concat(results.map(t => t.id));
            this.setFlag('monks-enhanced-journal', 'tokens', tokenids);

            let that = this;
            window.setTimeout(async function () {
                EncounterSheet.selectEncounter.call(that);
                if (options.combat) {
                    const combatTokens = canvas.tokens.controlled.map(t => t.document);
                    let combatants = await TokenDocument.implementation.createCombatants(combatTokens);
                    ui.sidebar.changeTab("combat", "primary");
                    if (combatants.length) {
                        combatants[0].combat.setFlag("monks-enhanced-journal", "encounterid", that.id);
                    }
                }
            }, 500);
        }
    }

    static onRollMonster(event, target) {
        this.rollTable("actors", false, event, target);
    }

    /* Items ---------------------------------------------------*/

    _onDropEncounterItem(event, target) {
        // Handle the drop event for encounter items
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Item') {
            this.addItem(data);
        }
    }

    static async onAssignItems(event, target) {
        this.constructor.assignItemsFromDocument.call(this.document);
    }

    static async assignItemsFromDocument() {
        let items = foundry.utils.duplicate(this.flags["monks-enhanced-journal"].items || {});
        let currency = this.flags["monks-enhanced-journal"].currency || {};
        items = await super.assignItems(items, currency);
        await this.setFlag('monks-enhanced-journal', 'items', items);

        for (let key of Object.keys(currency))
            currency[key] = 0;

        await this.setFlag('monks-enhanced-journal', 'currency', currency);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || {})[id];
        if (item) {
            let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining");
            let result = await EncounterSheet.confirmQuantity(item, max, "transfer", false);
            if ((result?.quantity ?? 0) > 0) {
                if (foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining") < result?.quantity) {
                    ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                    return false;
                }

                this.purchaseItem.call(this, entry, id, result.quantity, { actor, remaining: true });
                result.quantity *= (getValue(item, quantityname()) || 1);   // set the quantity if we're selling quantities of.
                return result;
            }
        }
        return false;
    }

    static onRefillItems(event, target) {
        this.refillItems("all");
    }

    static onRefillItem(event, target) {
        let li = target.closest('.item');
        let id = li.dataset.id;
        this.refillItems(id);
    }

    static onRollLoot(event, target) {
        this.rollTable("items", false, event, target);
    }

    /* DCs ---------------------------------------------------*/
    async getDCs() {
        let config = MonksEnhancedJournal.system;

        let safeGet = function (container, value) {
            if (config == undefined) return;
            if (config[container] == undefined) return;
            let label = config[container][value];
            return label?.label || label;
        }

        let dcs = this.document.getFlag("monks-enhanced-journal", "dcs");
        if (!dcs)
            return [];

        if (dcs instanceof Array) {
            let newDCs = {};
            for (let dc of dcs) {
                newDCs[dc.id] = dc;
            }

            dcs = newDCs;
            await this.document.setFlag("monks-enhanced-journal", "dcs", dcs);
        }

        let results = [];
        for (let [itemId, item] of Object.entries(dcs)) {
            let result = foundry.utils.duplicate(item);
            if (!result.label) {
                if (result.attribute == undefined || result.attribute.indexOf(':') < 0)
                    result.label = 'Invalid';
                else {
                    let [type, value] = result.attribute.split(':');
                    result.label = safeGet('attributes', value) || safeGet('abilities', value) || safeGet('skills', value) || safeGet('scores', value) || safeGet('atributos', value) || safeGet('pericias', value) || value;
                    result.label = i18n(result.label);
                }
            }
            result.img = (result.img == '' ? false : result.img);
            results.push(result);
        }
        return results;
    }

    static onCreateDC() {
        new DCConfig({ document: { dc: 10 }, journalentry: this }).render(true);
    }

    static onEditDC(event, target) {
        let item = target.closest('.item');
        let dc = (this.document.flags["monks-enhanced-journal"].dcs || {})[item.dataset.id];
        if (dc != undefined)
            new DCConfig({ document: dc, journalentry: this }).render(true);
    }

    static onRollDC(event, target) {
        let item = target.closest('.item');
        let dc = (this.document.flags["monks-enhanced-journal"].dcs || {})[item.dataset.id];

        /*
        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);
        let dctype = 'ability';
        //if (config?.skills[dc.attribute] || config?.pericias[dc.attribute] != undefined)
        //    dctype = 'skill';
        */

        if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
            game.MonksTokenBar.requestRoll(canvas.tokens.controlled, { request: `${dc.attribute}`, dc: dc.dc });
        }
    }
}
