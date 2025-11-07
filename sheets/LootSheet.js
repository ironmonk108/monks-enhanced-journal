import { setting, i18n, format, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { DistributeCurrency } from "../apps/distribute-currency.js";
import { TransferCurrency } from "../apps/transfer-currency.js";
import { getValue, setValue, MEJHelpers } from "../helpers.js";

export class LootSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.loot",
            icon: "fa-solid fa-donate",
        },
        actions: {
            transferCurrency: LootSheet.onTransferCurrency,
            splitCurrency: LootSheet.onSplitCurrency,
            addPlayers: LootSheet.onAddPlayers,
            clearPlayers: LootSheet.onClearPlayers,
            openActor: LootSheet.onOpenActor,
            rollItem: LootSheet.onRollItem,
            clearItems: LootSheet.clearAllItems,
            editItem: LootSheet.editItem,
            requestItem: LootSheet.onRequestItem,
            grantItem: LootSheet.onGrantItem,
            clickItem: LootSheet.onClickItem,
            itemSummary: LootSheet.onItemSummary,
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/loot.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-currency.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-loot-items.hbs",
            ],
            scrollable: [
                ".items-list .item-list",
            ]
        }
    };

    /*
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.sheettype.loot"),
            template: "modules/monks-enhanced-journal/templates/sheets/loot.html",
            dragDrop: [
                { dragSelector: ".document.item", dropSelector: ".loot-container" },
                { dragSelector: ".loot-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".loot-items .item-list .item .item-name", dropSelector: ".loot-character" },
                { dragSelector: ".loot-character", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".loot-items"]
        });
    }
    */

    static get type() {
        return 'loot';
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        let actors = this.document.getFlag('monks-enhanced-journal', 'actors');
        let players = [];

        if (actors == undefined && game.user.isGM) {
            actors = {};
            for (let user of game.users) {
                if (user.character && (user.active || setting("loot-inactive-players"))) {
                    actors[user.character.id] = { id: user.character.id, uuid: user.character.uuid, name: user.character.name, img: user.character.img };
                }
            }
            await this.document.setFlag('monks-enhanced-journal', 'actors', actors);
        }

        let actorIds = Object.keys(actors);

        context.purchaseOptions = {
            locked: "MonksEnhancedJournal.purchasing.locked",
            free: "MonksEnhancedJournal.purchasing.free",
            confirm: "MonksEnhancedJournal.purchasing.confirm"
        };

        let currency = (context.data.flags['monks-enhanced-journal'].currency || []);
        context.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: currency[c.id] ?? 0 };
        });

        context.groups = await this.getItemGroups(foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.purchasing"));

        context.canRequest = (context.data.flags['monks-enhanced-journal'].purchasing == "locked");

        context.characters = actorIds.map(a => {
            let actor = game.actors.get(a);
            if (actor) {
                let user = game.users.find(u => u.character?.id == actor.id);
                return {
                    id: actor.id,
                    name: actor.name,
                    img: actor.img,
                    color: user?.color,
                    letter: user?.name[0],
                    username: user?.name
                };
            }
        }).filter(a => !!a);

        context.purchasing = context.data.flags['monks-enhanced-journal'].purchasing || 'locked';
        context.showrequest = !game.user.isGM;

        context.players = players.join(", ");

        context.canTransferCurrency = true;
        context.canSplitCurrency = context.characters.length > 1;

        context.has = {
            items: Object.keys(context.groups || {})?.length > 0
        }

        context.placeholder = "MonksEnhancedJournal.Loot";

        context.hasShowToPlayers = true;
        context.showingToPlayers = this.document.parent.ownership["default"] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

        context.gridTemplate = `auto 150px${context.canRequest ? ' 100px' : ''}${context.canGrant ? ' 100px' : ''} 75px${context.showrequest ? ' 75px' : ''}${context.owner ? ' 40px' : ''}`;

        return context;
    }

    _dragDrop(html) {
        super._dragDrop(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".loot-items .items-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropLootItem.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".loot-characters .loot-character-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropActor.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".loot-items .item-name",
            permissions: {
                dragstart: this._canDragItemStart.bind(this)
            },
            callbacks: {
                dragstart: this._onDragItemsStart.bind(this)
            }
        }).bind(html);
    }

    _contextMenu(html) {
        super._contextMenu(html);

        const actorOptions = this._getActorContextOptions();
        if (actorOptions) new foundry.applications.ux.ContextMenu(html, ".loot-character", actorOptions, { fixed: true, jQuery: false });
    }

    static get defaultObject() {
        return { purchasing: 'confirm', items: [] };
    }

    _documentControls() {
        let ctrls = [
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'sound', label: i18n("MonksEnhancedJournal.AddSound"), icon: 'fas fa-music', visible: this.isEditable, action: "addSound" },
            { id: 'convert', label: i18n("MonksEnhancedJournal.Convert"), icon: 'fas fa-clipboard-list', visible: (game.user.isGM && this.isEditable), action: "convertSheet" }
        ];
        return ctrls.concat(super._documentControls());
    }

    configure() {
        let document = this.document;
        if (document instanceof JournalEntryPage)
            document = document.parent;
        new DocumentOwnershipConfig(document).render(true);
    }

    static async onSplitCurrency(event, target) {
        let characters = Object.keys(this.document.getFlag('monks-enhanced-journal', 'actors') || {}).map(a => {
            return game.actors.get(a);
        }).filter(a => !!a);
        if (characters.length == 0) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ThereAreNoCharactersToDistribute"));
            return;
        }

        let currency = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'currency') || {});
        if (Object.values(currency).find(v => v > 0) == undefined) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ThereAreNoMoneyToDistribute"));
            return;
        }

        new DistributeCurrency({ characters, currency, loot: this }).render(true, { focus: true });
    }

    static onTransferCurrency(event, target) {
        this.transferCurrency.call(this, null, event);
    }

    transferCurrency(actor, event) {
        new TransferCurrency({ document: this.document, actor, loot: this }).render(true, { focus: true });
    }

    async doSplitMoney(characters, remainder){
        for (let character of characters) {
            let actor = game.actors.get(character.id);
            for (let [k, v] of Object.entries(character.currency)) {
                if (v != 0) {
                    await this.addCurrency(actor, k, v);
                }
            }
        }
        await this.document.setFlag('monks-enhanced-journal', 'currency', remainder);
    }

    static async onClearPlayers() {
        await this.document.unsetFlag('monks-enhanced-journal', 'actors');
        await this.document.setFlag('monks-enhanced-journal', 'actors', {});
    }

    static async onAddPlayers() {
        let actors = {};
        for (let user of game.users) {
            if (user.character) {
                actors[user.character.id] = { id: user.character.id, uuid: user.character.uuid, name: user.character.name, img: user.character.img };
            }
        }
        await this.document.setFlag('monks-enhanced-journal', 'actors', actors);
    }

    _prepareSubmitData(event, form, formData, updateData) {
        let submitData = super._prepareSubmitData(event, form, formData, updateData);

        if (this.document.isOwner) {
            // Clean out any items with a quantity of 0 or less
            let items = foundry.utils.duplicate(submitData.flags['monks-enhanced-journal'].items || {});
            for (let [key, item] of Object.entries(items)) {
                let quantity = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity") ?? 0;
                if (quantity <= 0) {
                    delete items[key];
                    items[`-=${key}`] = null;
                }
            }
            submitData.flags['monks-enhanced-journal'].items = items;
        }

        return submitData;
    }

    _canDragItemStart(selector) {
        return (game.user.isGM || this.document.testUserPermission(game.user, "OBSERVER"));
    }

    async _onDragItemsStart(event) {
        const li = event.target.closest("li");

        const dragData = { from: this.document.uuid };

        if (!game.user.isGM && !['free', 'confirm'].includes(this.document.flags["monks-enhanced-journal"].purchasing)) {
            event.preventDefault();
            return;
        }

        let id = li.dataset.id;
        let item = (this.document.flags["monks-enhanced-journal"].items || {})[id];
        if (item == undefined || (!game.user.isGM && (item?.lock === true || getValue(item, quantityname()) <= 0)))
            return;

        dragData.itemId = id;
        dragData.uuid = this.document.uuid;
        dragData.type = "Item";
        dragData.data = foundry.utils.duplicate(item);
        MonksEnhancedJournal._dragItem = id;

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        
    }

    async _onDropLootItem(event, target) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Item') {
            let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);

            let entry;
            try {
                entry = await fromUuid(data.from);
            } catch { }

            if (data.from == this.document.uuid) {
                let lootCharacter = event.target.closest('.loot-character');
                if (!lootCharacter)
                    return;

                event.preventDefault();
                let actor = game.actors.get(lootCharacter.id);
                if (actor) {
                    let item = await this.getDocument(data);
                    let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
                    let result = await LootSheet.confirmQuantity(item, max, "transfer", false);
                    if ((result?.quantity ?? 0) > 0) {
                        let itemData = item.toObject();
                        if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                            itemData = await LootSheet.createScrollFromSpell(itemData);
                        }
                        delete itemData._id;
                        let itemQty = getValue(itemData, quantityname(), 1);
                        setValue(itemData, quantityname(), result.quantity * itemQty);
                        let sheet = actor.sheet;
                        if (sheet._onDropItem)
                            sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, itemData );
                        else
                            actor.createEmbeddedDocuments("Item", [itemData]);

                        if (entry)
                            this.constructor.purchaseItem.call(this.constructor, entry, data.data._id, result.quantity, { actor });
                    }
                }
            } else {
                if (!this.document.isOwner && !hasGM) {
                    return ui.notifications.warn("Cannot drop items on this sheet without a GM logged in");
                }
                if (data.groupSelect) {
                    let itemId = data.uuid.substring(0, data.uuid.length - 16);
                    for (let item of data.groupSelect) {
                        await this.addItem({ type: "Item", uuid: `${itemId}${item}` });
                    }
                    game?.MultipleDocumentSelection?.clearAllTabs();
                } else {
                    let item = await this.getDocument(data);
                    let max = getValue(item, quantityname(), null);
                    if (!entry && !item.actor?.id)
                        max = null;

                    //Don't transfer between Loot sheets unless purchasing is set to "Anyone" or the player owns the sheet
                    if (entry
                        && !((this.document.flags["monks-enhanced-journal"].purchasing == "free" || this.document.isOwner)
                            && ((entry.flags["monks-enhanced-journal"].purchasing == "free" || entry.isOwner))))
                        return;

                    //Only allow players to drop things from their own player onto the loot sheet
                    if (!this.document.isOwner && !(item.actor.id || entry))
                        return;

                    let result = await LootSheet.confirmQuantity(item, max, "transfer", false);
                    if ((result?.quantity ?? 0) > 0) {
                        let itemData = item.toObject();
                        foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", result.quantity);
                        setValue(itemData, quantityname(), 1);

                        if (game.user.isGM || this.document.isOwner) {
                            this.addItem({ data: itemData });
                        } else {
                            MonksEnhancedJournal.emit("addItem",
                                {
                                    lootid: this.document.uuid,
                                    itemdata: itemData
                                });
                        }

                        //is this transferring from another journal entry?
                        if (entry) {
                            if (game.user.isGM)
                                this.constructor.purchaseItem.call(this.constructor, entry, data.data._id, result.quantity, { chatmessage: false });
                            else {
                                MonksEnhancedJournal.emit("purchaseItem",
                                    {
                                        shopid: entry.uuid,
                                        itemid: data.data._id,
                                        user: game.user.id,
                                        quantity: result.quantity,
                                        chatmessage: false
                                    });
                            }
                        } else if (item.actor) {
                            //let actorItem = item.actor.items.get(data.data._id);
                            let quantity = getValue(item, quantityname());
                            if (result.quantity >= quantity)
                                await item.delete();
                            else {
                                let update = { system: {} };
                                update.system[quantityname()] = quantity - result.quantity;
                                await item.update(update);
                            }
                        }
                    }
                }
            }
        } else if (data.type == 'Folder') {
            if (!this.document.isOwner)
                return false;
            // Import items from the folder
            let folder = await fromUuid(data.uuid);
            if (folder) {
                for (let item of folder.contents) {
                    if (item instanceof Item) {
                        let itemData = item.toObject();
                        foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", 1);
                        await this.addItem({ data: itemData });
                    }
                }
            }
        }
    }

    async _onDropActor(event, target) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Actor') {
            //Add this actor to the list
            let hasChanged = false;
            let actors = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'actors') || {});

            if (data.groupSelect) {
                for (let actor of data.groupSelect) {
                    if (!actors[actor.id]) {
                        actors[actor.id] = { id: actor.id, uuid: actor.uuid, name: actor.name, img: actor.img };
                        hasChanged = true;
                    }
                }
            } else {
                let actor = await fromUuid(data.uuid);
                if (actor && !actors[actor.id]) {
                    actors[actor.id] = { id: actor.id, uuid: actor.uuid, name: actor.name, img: actor.img };
                    hasChanged = true;
                }
            }

            if (hasChanged)
                this.document.setFlag('monks-enhanced-journal', 'actors', actors);
        } else if (data.type == 'Item') {
            this._onDropLootItem(event, target);
        }
        log('drop data', event, data);
    }

    static async onRequestItem(event, target) {
        let li = target.closest("li");

        let item;
        let id = li.dataset.id;
        item = (this.document.flags['monks-enhanced-journal'].items || {})[id];

        if (!item)
            return;

        const actor = game.user.character;
        if (!actor) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDontHaveCharacter"));
            return;
        }

        let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
        if (!game.user.isGM && (max != null && max <= 0)) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
            return false;
        }

        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (!(this.document.isOwner && this.document.flags['monks-enhanced-journal'].purchasing == 'free') && !hasGM) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTakeLootWithoutGM"));
            return false;
        }

        if (this.document.flags['monks-enhanced-journal'].purchasing == 'locked') {
            MonksEnhancedJournal.emit("requestLoot",
                {
                    shopid: this.document.uuid,
                    actorid: game.user.character.id,
                    itemid: id
                }
            );
        } else if (this.document.flags['monks-enhanced-journal'].purchasing == 'confirm') {
            let result = await LootSheet.confirmQuantity(item, max, "take", false);
            if ((result?.quantity ?? 0) > 0) {
                //create the chat message informaing the GM that player is trying to sell an item.
                item = foundry.utils.duplicate(item);
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.quantity", result.quantity);
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.maxquantity", max);
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.cost", null);

                LootSheet.createRequestMessage.call(this, this.document, item, actor, false);
                MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
            }
        } else if (this.document.flags['monks-enhanced-journal'].purchasing == 'free') {
            let result = await LootSheet.confirmQuantity(item, max, "take", false);
            if ((result?.quantity ?? 0) > 0) {
                // Create the owned item
                let itemData = foundry.utils.duplicate(item);
                delete itemData._id;
                let itemQty = getValue(itemData, quantityname(), 1);
                setValue(itemData, quantityname(), result.quantity * itemQty);
                let sheet = actor.sheet;
                if (sheet._onDropItem)
                    sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, itemData);
                else
                    actor.createEmbeddedDocuments("Item", [itemData]);

                if (this.document.isOwner) {
                    this.constructor.purchaseItem.call(this.constructor, this.document, item._id, result.quantity, { chatmessage: false });
                } else {
                    MonksEnhancedJournal.emit("purchaseItem",
                        {
                            shopid: this.document.uuid,
                            itemid: item._id,
                            actorid: actor.id,
                            user: game.user.id,
                            quantity: result.quantity
                        });
                }
            }
        }
    }

    static async onGrantItem(event, target) {
        let userId = target.dataset.userId;
        let li = target.closest("li.item");

        let item;
        let id = li.dataset.id;
        let items = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal'].items) || {};
        item = items[id];

        if (!item || foundry.utils.getProperty(item, "flags.monks-enhanced-journal.requests").length == 0)
            return;

        let user = game.users.get(userId);
        if (!user) return;

        const actor = user.character;
        if (!actor) return;

        let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
        let result = await LootSheet.confirmQuantity(item, max, format("MonksEnhancedJournal.GrantToActor", { name: actor.name }), false);
        if ((result?.quantity ?? 0) > 0) {
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.requests." + userId, false);
            await this.document.setFlag('monks-enhanced-journal', 'items', items);

            // Create the owned item
            let itemData = foundry.utils.duplicate(item);
            delete itemData._id;
            let itemQty = getValue(itemData, quantityname(), 1);
            setValue(itemData, quantityname(), result.quantity * itemQty);
            let sheet = actor.sheet;
            if (sheet._onDropItem)
                sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, itemData );
            else
                actor.createEmbeddedDocuments("Item", [itemData]);

            await this.constructor.purchaseItem.call(this.constructor, this.document, id, result.quantity, { actor, user });
        } else if (result?.quantity === 0) {
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.requests." + userId, false);
            await this.document.setFlag('monks-enhanced-journal', 'items', items);
        }
    }

    /*
    async addItem(data) {
        let item = await this.getDocument(data);

        if (item) {
            let items = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].items || []);

            let itemData = item.toObject();
            if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                itemData = await LootSheet.createScrollFromSpell(itemData);
            }

            let sysPrice = MEJHelpers.getSystemPrice(item, pricename()); //MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
            let price = MEJHelpers.getPrice(sysPrice);
            let flags = Object.assign({ quantity: 1 }, foundry.utils.getProperty(itemData, "flags.monks-enhanced-journal"), {
                parentId: item.id,
                price: `${price.value} ${price.currency}`
            });
            let update = { _id: makeid(), flags: { 'monks-enhanced-journal': flags } };
            if (game.system.id == "dnd5e") {
                foundry.utils.setProperty(update, "system.equipped", false);
            }
            items.push(foundry.utils.mergeObject(itemData, update));
            this.document.flags["monks-enhanced-journal"].items = items;
            await this.document.setFlag('monks-enhanced-journal', 'items', items);
            return true;
        }
    }
    */

    static onClickItem(event, target) {
        let li = target.closest('li');
        event.currentTarget = li;

        let item = game.items.find(i => i.id == li.dataset.id)
        if (item == undefined && this.document.flags["monks-enhanced-journal"].actor) {
            let actorid = this.document.flags["monks-enhanced-journal"].actor.id;
            let actor = game.actors.get(actorid);
            if (actor)
                item = actor.items.get(li.dataset.id);
        }

        if (item)
            return item.sheet.render(true);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || {})[id];
        if (item) {
            let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
            if (!game.user.isGM && (max != null && max <= 0)) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                return false;
            }

            let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
            if (!hasGM) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTakeLootWithoutGM"));
                return false;
            }

            let result = await LootSheet.confirmQuantity(item, max, "take", false);
            if ((result?.quantity ?? 0) > 0) {
                if (game.user.isGM) {
                    LootSheet.purchaseItem.call(this, entry, id, result.quantity, { actor });
                    return result;
                } else {
                    if (entry.data.flags["monks-enhanced-journal"].purchasing == 'confirm') {
                        //create the chat message informaing the GM that player is trying to sell an item.
                        item = foundry.utils.duplicate(item);
                        foundry.utils.setProperty(item, "flags.monks-enhanced-journal.quantity", result.quantity);
                        foundry.utils.setProperty(item, "flags.monks-enhanced-journal.maxquantity", (max != "" ? parseInt(max) : null));
                        delete item.cost;

                        LootSheet.createRequestMessage.call(this, entry, item, actor, false);
                        MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                    } else {
                        if (result.quantity > 0) {
                            MonksEnhancedJournal.emit("purchaseItem",
                                {
                                    shopid: entry.uuid,
                                    actorid: actor.id,
                                    itemid: id,
                                    quantity: result.quantity,
                                    user: game.user.id
                                });
                            return result;
                        }
                    }
                }
            }
        }

        return false;
    }

    /*
    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        let items = this.document.getFlag('monks-enhanced-journal', 'items');
        let itemData = items.find(i => i._id == id);

        const item = new CONFIG.Item.documentClass(itemData);
        let chatData = foundry.utils.getProperty(item, "data.data.description");
        if (item.getChatData)
            chatData = item.getChatData({ secrets: false });

        if (chatData instanceof Promise)
            chatData = await chatData;

        if (chatData) {
            // Toggle summary
            if (li.hasClass("expanded")) {
                let summary = li.children(".item-summary");
                summary.slideUp(200, () => summary.remove());
            } else {
                let div = $(`<div class="item-summary">${(typeof chatData == "string" ? chatData : chatData.description.value || chatData.description)}</div>`);
                let props = $('<div class="item-properties"></div>');
                chatData.properties.forEach(p => props.append(`<span class="tag">${p.name || p}</span>`));
                if (chatData.price != undefined)
                    props.append(`<span class="tag">${i18n("MonksEnhancedJournal.Price")}: ${chatData.price}</span>`)
                div.append(props);
                li.append(div.hide());
                div.slideDown(200);
            }
            li.toggleClass("expanded");
        }
    }*/

    static onOpenActor(event, target) {
        let actor = game.actors.get(target.id);
        if (actor)
            actor.sheet.render(true);
    }

    removeActor(id) {
        if (id) {
            let actors = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'actors') || {});
            delete actors[id];
            actors[`-=${id}`] = null;
            this.document.setFlag('monks-enhanced-journal', 'actors', actors);
        }
    }

    _getActorContextOptions() {
        return [
            {
                name: "Transfer Funds",
                icon: '<i class="fas fa-user"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.id;
                    const actor = game.actors.get(id);
                    this.transferCurrency(actor);
                }
            },
            {
                name: i18n("MonksEnhancedJournal.RemoveActor"),
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.id;
                    foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: i18n("MonksEnhancedJournal.RemoveActor"),
                        },
                        content: i18n("MonksEnhancedJournal.AreYouSureRemoveActor"),
                        yes: {
                            callback: this.removeActor.bind(this, id)
                        }
                    });
                }
            }
        ];
    }

    static onRollItem(event, target) {
        this.rollTable("items", false, event, target);
    }
}
