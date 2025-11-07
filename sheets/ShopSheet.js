import { setting, i18n, format, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { getValue, setValue, setPrice, MEJHelpers } from "../helpers.js";
import { AdjustPrice } from "../apps/adjust-price.js";

export class ShopSheet extends EnhancedJournalSheet {

    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.shop",
            icon: "fa-solid fa-dolly-flatbed",
        },
        actions: {
            clearLog: ShopSheet.onClearLog,
            openPlayerConfig: ShopSheet.onOpenPlayerConfig,
            rollItem: ShopSheet.onRollItem,
            adjustPrice: ShopSheet.onAdjustPrice,
            requestItem: ShopSheet.onRequestItem,
            clickItem: ShopSheet.onClickItem,
            toggleConsumable: ShopSheet.onToggleConsumable,
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/shop.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-detailed-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-shop-details.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-transactions.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-shop-items.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-relationships.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-notes.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".editor-display",
                ".editor-content",
                ".relationships .item-list",
                ".shop-items .item-list",
                ".shop-transactions .item-list"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "shop-details", icon: "fa-solid fa-table" },
                { id: "transactions", icon: "fa-solid fa-handshake" },
                { id: "items", icon: "fa-solid fa-cart-flatbed" },
                { id: "relationships", icon: "fa-solid fa-users" },
                { id: "notes", icon: "fa-solid fa-paperclip" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    /*
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.sheettype.shop"),
            template: "modules/monks-enhanced-journal/templates/sheets/shop.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".shop-container" },
                { dragSelector: ".document.item", dropSelector: ".shop-container" },
                { dragSelector: ".shop-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".actor-img img", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".shop-items > .item-list", ".tab.description .tab-inner"]
        });
    }
    */

    static get type() {
        return 'shop';
    }

    _prepareTabs(group) {
        let tabs = super._prepareTabs(group);

        // Check if this system can use DCs
        if (!this.document.isOwner) {
            delete tabs['shop-details'];
            delete tabs['transactions'];
        }

        return tabs;
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        if (!foundry.utils.hasProperty(context, "data.flags.monks-enhanced-journal.sheet-settings.adjustment") && foundry.utils.hasProperty(context, "data.flags.monks-enhanced-journal.adjustment")) {
            await this.document.update({ 'monks-enhanced-journal.flags.sheet-settings.adjustment': foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.adjustment") });
        }

        context.purchaseOptions = {
            locked: "MonksEnhancedJournal.purchasing.locked",
            free: "MonksEnhancedJournal.purchasing.free",
            confirm: "MonksEnhancedJournal.purchasing.request"
        };

        context.sellingOptions = {
            locked: "MonksEnhancedJournal.selling.locked",
            free: "MonksEnhancedJournal.selling.free",
            confirm: "MonksEnhancedJournal.selling.request"
        };

        context.openOptions = {
            open: "MonksEnhancedJournal.open.open",
            closed: "MonksEnhancedJournal.open.closed"
        }

        //get shop items
        context.groups = await this.getItemGroups(foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.purchasing"), this.document._sort);

        let purchasing = context.data.flags['monks-enhanced-journal']?.purchasing || 'confirm';
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        context.showrequest = (['confirm', 'free'].includes(purchasing) && !this.document.isOwner && game.user.character && hasGM);
        context.nocharacter = !game.user.isGM && !game.user.character;

        context.showrarity = (game.system.id == "dnd5e" || game.system.id == "pf2e");

        let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = actorLink.id ? game.actors.find(a => a.id == actorLink.id) : await fromUuid(actorLink);

            if (actor && actor.testUserPermission(game.user, "OBSERVER")) {
                context.actor = { uuid: actor.uuid, name: actor.name, img: actor.img };
            }
        }
        context.canViewActor = !!context.actor;

        context.relationships = await this.getRelationships();

        context.hasRollTables = !!game.packs.get("monks-enhanced-journal.shop-names");

        let getTime = (prop) => {
            let twentyfour = foundry.utils.getProperty(context, `data.flags.monks-enhanced-journal.twentyfour`);
            let time = foundry.utils.getProperty(context, `data.flags.monks-enhanced-journal.${prop}`);
            let hours = Math.floor(time / 60);
            let minutes = Math.trunc(time - (hours * 60));
            return time ? `${twentyfour || hours < 13 ? hours : hours - 12}:${String(minutes).padStart(2, '0')}${!twentyfour ? ' ' + (hours >= 12 ? "PM" : "AM") : ''}` : "";
        }

        context.opening = getTime("opening");
        context.closing = getTime("closing");

        context.hours = (context.opening && context.closing ? `${context.opening} - ${context.closing}, ` : '');

        let state = foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.state");
        let newstate = MonksEnhancedJournal.getOpenState(context.data);
        if (newstate != state)
            this.document.setFlag("monks-enhanced-journal", "state", newstate);
        context.open = (newstate != "closed");

        context.hideitems = !context.open && !this.document.isOwner;

        context.log = (foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.log") || []).map(l => {
            let date = new Date(l.time);
            return Object.assign({}, l, { time: date.toLocaleDateString()});
        });

        context.has = {
            items: Object.keys(context.groups || {}).length > 0,
            relationships: Object.keys(context.relationships || {})?.length > 0
        }

        context.fields = [
            { id: 'shoptype', label: "MonksEnhancedJournal.ShopType", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.shoptype") },
            { id: 'location', label: "MonksEnhancedJournal.Location", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.location") },
            { label: "MonksEnhancedJournal.HoursOfOperation", value: `${context.hours} ${context.open ? i18n('MonksEnhancedJournal.Open') : i18n('MonksEnhancedJournal.Closed')}` }
        ]
        context.placeholder = "MonksEnhancedJournal.ShopName";

        context.hasShowToPlayers = true;
        context.showingToPlayers = this.document.parent.ownership["default"] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

        return context;
    }

    static get defaultObject() {
        return {
            purchasing: 'confirm',
            selling: 'confirm',
            items: [],
            opening: 480,
            closing: 1020
        };
    }

    _dragDrop(html) {
        super._dragDrop(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".shop-items",
            permissions: {
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                drop: this._onDropItem.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".shop-items .item-name",
            permissions: {
                dragstart: this._canDragItemStart.bind(this)
            },
            callbacks: {
                dragstart: this._onDragItemStart.bind(this)
            }
        }).bind(html);
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

    _prepareSubmitData(event, form, formData, updateData) {
        const fd = foundry.utils.expandObject(formData.object);

        const submitData = super._prepareSubmitData(event, form, formData, updateData);

        let parseTime = (prop) => {
            if (fd[prop]) {
                let [hour, minValue] = fd[prop].split(":");
                let [minute, ampm] = (minValue ?? "00").split(" ");
                if (ampm?.toLowerCase() == "pm") hour = parseInt(hour) + 12;
                foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.twentyfour", !ampm);
                foundry.utils.setProperty(submitData, `flags.monks-enhanced-journal.${prop}`, (parseInt(hour) * 60) + parseInt(minute));
            }
        }

        parseTime("opening");
        parseTime("closing");

        let state = MonksEnhancedJournal.getOpenState(fd);
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.state", state);

        return submitData;
    }

    _canDragItemStart(selector) {
        if (selector == ".document.item") return true;
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        return game.user.isGM || (['free', 'confirm'].includes(this.document.flags["monks-enhanced-journal"].purchasing) && hasGM);
    }

    _canDragDrop(selector) {
        return true;
    }

    async _onDragItemStart(event) {
        const target = event.currentTarget;

        if (target.dataset.document == "Actor") {
            const dragData = {
                uuid: target.dataset.uuid,
                type: target.dataset.document
            };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        } else {
            const li = $(target).closest("li")[0];

            const dragData = { from: this.document.uuid };

            if (!game.user.isGM && !['free', 'confirm'].includes(this.document.flags["monks-enhanced-journal"].purchasing)) {
                event.preventDefault();
                return;
            }

            let id = li.dataset.id;

            let item = this.document.flags["monks-enhanced-journal"].items[id];
            if (item == undefined) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.CannotFindItem"));
                return;
            }

            if (!game.user.isGM && item?.lock === true) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.ItemIsLocked"));
                return;
            }

            let qty = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
            if (!game.user.isGM && (qty != null && qty <= 0)) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.NotEnoughRemainsToBeTransferred"));
                return;
            }

            dragData.itemId = id;
            dragData.uuid = this.document.uuid;
            dragData.type = "Item";
            dragData.data = foundry.utils.duplicate(item);
            MonksEnhancedJournal._dragItem = id;

            log('Drag Start', dragData);

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        }
    }

    async _onDropItem(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Folder') {
            if (!this.document.isOwner)
                return false;
            // Import items from the folder
            let folder = await fromUuid(data.uuid);
            if (folder) {
                let items = [];
                for (let item of folder.contents) {
                    if (item instanceof Item) {
                        let itemData = item.toObject();
                        let sysPrice = MEJHelpers.getSystemPrice(item, pricename());
                        let price = MEJHelpers.getPrice(sysPrice);

                        foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", 1);
                        foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.price", price.value + " " + price.currency);
                        items.push({ data: itemData });
                    }
                }
                await this.addItem(items);
            }
        } else if (data.type == 'Item') {
            if (data.from == this.document.uuid)  //don't drop on yourself
                return;

            if (data.groupSelect) {
                let itemId = data.uuid.substring(0, data.uuid.length - 16);
                for (let item of data.groupSelect) {
                    await this.addItem({ type: "Item", uuid: `${itemId}${item}` });
                }
                game?.MultipleDocumentSelection?.clearAllTabs();
            } else {
                let item = await ShopSheet.getDocument(data);
                if (item.parent instanceof Actor) {
                    let actor = item.parent;
                    if (!actor)
                        return;

                    if (game.user.isGM) {
                        let max = getValue(item, quantityname());

                        let sysPrice = MEJHelpers.getSystemPrice(item, pricename());
                        let price = MEJHelpers.getPrice(sysPrice);
                        let origPrice = price.value;
                        let adjustment = this.sheetSettings()?.adjustment || {};
                        let buy = adjustment[item.type]?.buy ?? adjustment.default.buy ?? 0.5;
                        if (buy == -1)
                            return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotSellItem"));
                        price.value = Math.floor(price.value * buy);
                        let result = await this.constructor.confirmQuantity(item, max, "sell", true, price);
                        if ((result?.quantity ?? 0) > 0) {
                            let itemData = item.toObject();
                            foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", result.quantity);
                            foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.price", origPrice + " " + price.currency);
                            foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.lock", true);
                            foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.from", actor.name);
                            this.addItem({ data: itemData });

                            await this.constructor.actorPurchase(actor, { value: -(result.price.value * result.quantity), currency: result.price.currency });

                            if (result.quantity >= max)
                                item.delete();
                            else {
                                let update = { system: {} };
                                foundry.utils.setProperty(update.system, quantityname(), max - result.quantity);
                                item.update(update);
                            }

                            this.constructor.addLog.call(this.document, { actor: actor.name, item: item.name, quantity: result.quantity, price: price.value + " " + price.currency, type: 'sell' });
                        }
                    } else {
                        let selling = this.document.getFlag('monks-enhanced-journal', 'selling');
                        if (selling == "locked" || !selling) {
                            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ShopIsNotReceivingItems"));
                            return false;
                        }

                        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
                        if (!hasGM) {
                            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotSellItemWithoutGM"));
                            return false;
                        }
                        //request to sell
                        let max = getValue(item, quantityname());
                        let sysPrice = MEJHelpers.getSystemPrice(item, pricename());
                        let price = MEJHelpers.getPrice(sysPrice);
                        let origPrice = price.value;
                        let adjustment = this.sheetSettings()?.adjustment || {};
                        let buy = adjustment[item.type]?.buy ?? adjustment.default.buy ?? 0.5;
                        if (buy == -1)
                            return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotSellItem"));
                        price.value = Math.floor(price.value * buy);
                        let result = await this.constructor.confirmQuantity(item, max, "sell", true, price);
                        if ((result?.quantity ?? 0) > 0) {
                            if (selling == "free") {
                                //give the player the money
                                await this.constructor.actorPurchase(actor, { value: -(price.value * result.quantity), currency: price.currency });

                                //add the item to the shop
                                let itemData = item.toObject();
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", result.quantity);
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.price", origPrice + " " + price.currency);
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.lock", true);
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.from", actor.name);

                                MonksEnhancedJournal.emit("sellItem", { shopid: this.document.uuid, itemdata: itemData });

                                //remove the item from the actor
                                if (result.quantity == max) {
                                    await item.delete();
                                } else {
                                    let update = { system: {} };
                                    foundry.utils.setProperty(update.system, quantityname(), max - result.quantity);
                                    item.update(update);
                                }

                                this.constructor.addLog.call(this.document, { actor: actor.name, item: item.name, quantity: result.quantity, price: price.value + " " + price.currency, type: 'sell' });
                            } else {
                                let itemData = item.toObject();
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", result.quantity);
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.price", origPrice + " " + price.currency);
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.lock", true);
                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.from", actor.name);

                                this.createSellMessage(itemData, actor);
                            }
                        }
                    }
                } else {
                    let result = await ShopSheet.confirmQuantity(item, null, "transfer", false);
                    if ((result?.quantity ?? 0) > 0) {
                        let itemData = item.toObject();
                        let sysPrice = MEJHelpers.getSystemPrice(item, pricename());
                        let price = MEJHelpers.getPrice(sysPrice);

                        foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.quantity", result.quantity);
                        foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.price", price.value + " " + price.currency);
                        this.addItem({ data: itemData });
                    }
                }
            }
        } else if (data.type == 'JournalEntry') {
            let shop = await fromUuid(data.uuid);
            if (shop.pages.size == 1 && (foundry.utils.getProperty(shop.pages.contents[0], "flags.monks-enhanced-journal.type") == "shop" || foundry.utils.getProperty(shop, "flags.monks-enhanced-journal.type") == "shop")) {
                let page = shop.pages.contents[0];
                let items = foundry.utils.duplicate(foundry.utils.getProperty(page, "flags.monks-enhanced-journal.items") || []);
                let shopPage = this.document instanceof JournalEntry ? this.document.pages.contents[0] : this.document;
                let oldItems = foundry.utils.duplicate(foundry.utils.getProperty(shopPage, "flags.monks-enhanced-journal.items") || []);

                if (oldItems.length) {
                    await foundry.applications.api.DialogV2.wait({
                        window: {
                            title: "Add Shop Items",
                        },
                        content: "Would you like to replace the items in the shop with these items, or add to the items already in the shop?",
                        focus: true,
                        default: "replace",
                        close: () => {
                            return true;
                        },
                        buttons: [
                            {
                                action: "replace",
                                label: "Replace",
                                callback: () => {
                                    shopPage.setFlag('monks-enhanced-journal', 'items', items);
                                }
                            },
                            {
                                action: "add",
                                label: "Add",
                                callback: () => {
                                    shopPage.setFlag('monks-enhanced-journal', 'items', items.concat(oldItems));
                                }
                            }
                        ]
                    });
                } else {
                    shopPage.setFlag('monks-enhanced-journal', 'items', items);
                }
            }
        }

        log('drop data', event, data);
    }

    static async onClearLog() {
        await this.document.setFlag("monks-enhanced-journal", "log", []);
    }

    static async onOpenPlayerConfig() {
        game.user.sheet.render(true);
    }

    static onAlterSort(event, target) {
        this.document._sort = $(target).attr("sort");
        if (this.enhancedjournal)
            this.enhancedjournal.render();
        else
            this.render();
    }

    static async onAdjustPrice(event) {
        new AdjustPrice({ document: this.document, journalsheet: this }).render(true);
    }

    static async onRequestItem(event, target) {
        let li = target.closest("li");

        let id = li.dataset.id;
        let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};
        let item = items[id];

        if (!item)
            return;

        const actor = game.user.character;
        if (!actor) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDontHaveCharacter"));
            return;
        }

        let data = foundry.utils.getProperty(item, "flags.monks-enhanced-journal");
        data.consumable = item.consumable || false;

        if (data.cost && data.cost != '') {
            //check if the player can afford it
            if (!this.constructor.canAfford(item, actor)) {
                ui.notifications.warn(format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name } ));
                return false;
            }
        }

        let max = data.quantity;
        if (!game.user.isGM && (max != null && max <= 0)) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
            return false;
        }

        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (!hasGM) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotPurchaseItemWithoutGM"));
            return false;
        }

        let result = await ShopSheet.confirmQuantity(item, max, "purchase");
        if ((result?.quantity ?? 0) > 0) {
            let price = MEJHelpers.getPrice(data.cost);

            if (this.document.flags['monks-enhanced-journal'].purchasing == 'confirm') {
                //create the chat message informaing the GM that player is trying to sell an item.
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.quantity", result.quantity);
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.maxquantity", (max != "" ? parseInt(max) : null));

                if (!ShopSheet.canAfford((result.quantity * price.value) + " " + price.currency, actor))
                    ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: result.quantity, itemname: item.name}));
                else {
                    this.constructor.createRequestMessage.call(this, this.document, item, actor, true);
                    MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                }
            } else if (this.document.flags['monks-enhanced-journal'].purchasing == 'free') {
                // Create the owned item
                if (!ShopSheet.canAfford((result.quantity * price.value) + " " + price.currency, actor))
                    ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: result.quantity, itemname: item.name }));
                else {
                    let itemData = foundry.utils.duplicate(item);
                    delete itemData._id;
                    let itemQty = getValue(itemData, quantityname(), 1);
                    setValue(itemData, quantityname(), result.quantity * itemQty);
                    if (!setting("use-generic-price"))
                        setPrice(itemData, pricename(), result.price);
                    if (!data.consumable) {
                        let sheet = actor.sheet;
                        if (sheet._onDropItem)
                            sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, itemData );
                        else
                            actor.createEmbeddedDocuments("Item", [itemData]);
                    }

                    MonksEnhancedJournal.emit("purchaseItem",
                        {
                            shopid: this.document.uuid,
                            itemid: item._id,
                            actorid: actor.id,
                            user: game.user.id,
                            quantity: result.quantity,
                            purchase: true
                        });
                }
            }
        }
    }

    async createSellMessage(item, actor) {
        let data = foundry.utils.getProperty(item, "flags.monks-enhanced-journal");
        let price = MEJHelpers.getPrice(data.price);
        let adjustment = this.sheetSettings()?.adjustment || {};
        let buy = adjustment[item.type]?.buy ?? adjustment.default.buy ?? 0.5;
        data.sell = Math.floor(price.value * buy);
        data.currency = price.currency;
        data.maxquantity = data.quantity;
        data.quantity = Math.max(Math.min(data.maxquantity, data.quantity), 1);
        data.total = data.quantity * data.sell;
        foundry.utils.setProperty(item, "flags.monks-enhanced-journal", data);

        let detail = MonksEnhancedJournal.getItemDetails(item);

        item.name = detail.name;
        item.img = detail.img;

        let messageContent = {
            action: 'sell',
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [item],
            shop: { id: this.document.id, uuid: this.document.uuid, name: this.document.name, img: this.document.img }
        }

        //create a chat message
        let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        if (!whisper.find(u => u == game.user.id))
            whisper.push(game.user.id);
        let speaker = ChatMessage.getSpeaker();
        let content = await foundry.applications.handlebars.renderTemplate("./modules/monks-enhanced-journal/templates/request-sale.html", messageContent);
        let messageData = {
            user: game.user.id,
            speaker: speaker,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
            content: content,
            flavor: (speaker.alias ? format("MonksEnhancedJournal.ActorWantsToPurchase", { alias: speaker.alias, verb: i18n("MonksEnhancedJournal.Sell").toLowerCase() }) : null),
            whisper: whisper,
            flags: {
                'monks-enhanced-journal': messageContent
            }
        };

        ChatMessage.create(messageData, {});
    }

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

    static canAfford(item, actor) {
        //find the currency
        let price = MEJHelpers.getPrice(typeof item == "string" ? item : foundry.utils.getProperty(item, "flags.monks-enhanced-journal.cost"));
        if (price.value == 0)
            return true;

        if (MonksEnhancedJournal.currencies.length == 0)
            return true;

        if (setting("purchase-conversion")) {
            let coins = this.getCurrency(actor, price.currency);
            if (coins >= price.value) {
                return true;
            } else {
                let totalDefault = 0;
                for (let curr of MonksEnhancedJournal.currencies) {
                    totalDefault += (this.getCurrency(actor, curr.id) * (curr.convert || 1));
                }
                let check = MonksEnhancedJournal.currencies.find(c => c.id == price.currency);
                totalDefault = totalDefault / (check?.convert || 1);

                return totalDefault >= price.value;
            }
        } else {
            let coins = this.getCurrency(actor, price.currency);
            return coins >= price.value;
        }
    }

    static actorPurchase(actor, price) {
        //find the currency
        if (price.value == 0)
            return;

        if (MonksEnhancedJournal.currencies.length == 0)
            return;

        ShopSheet.addCurrency(actor, price.currency, -price.value);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || {})[id];
        if (item) {
            let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
            if (!game.user.isGM && (max != null && max <= 0)) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                return false;
            }

            let cost = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.cost");
            if (cost && cost != '') {
                //check if the player can afford it
                if (!this.canAfford(item, actor)) {
                    ui.notifications.warn(format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name }));
                    return false;
                }
            }

            let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
            if (!hasGM) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotPurchaseItemWithoutGM"));
                return false;
            }

            let price = MEJHelpers.getPrice(cost);

            let result = await ShopSheet.confirmQuantity(item, max, "purchase");
            if ((result?.quantity ?? 0) > 0) {
                price = result.price;
                if (game.user.isGM) {
                    ShopSheet.actorPurchase.call(entry, actor, { value: (price.value * result.quantity), currency: price.currency });
                    ShopSheet.purchaseItem.call(this, entry, id, result.quantity, { actor, purchased: true });
                    if (item.consumable)
                        result.quantity = 0;
                    this.addLog.call(entry, { actor: actor.name, item: item.name, quantity: result.quantity, price: result.price.value + " " + result.price.currency, type: 'purchase' });
                    return result;
                } else {
                    if (foundry.utils.getProperty(entry, "flags.monks-enhanced-journal.purchasing") == 'confirm') {
                        //create the chat message informaing the GM that player is trying to sell an item.
                        foundry.utils.setProperty(item, "flags.monks-enhanced-journal.quantity", result.quantity);
                        foundry.utils.setProperty(item, "flags.monks-enhanced-journal.maxquantity", (max != "" ? parseInt(max) : null));

                        if (!ShopSheet.canAfford((result.quantity * price.value) + " " + price.currency, actor))
                            ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: result.quantity, itemname: item.name}));
                        else {
                            ShopSheet.createRequestMessage.call(this, entry, item, actor, true);
                            MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                        }
                    } else {
                        if (!ShopSheet.canAfford((result.quantity * price.value) + " " + price.currency, actor)) {
                            ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: result.quantity, itemname: item.name }));
                            result = false;
                        } else {
                            if (result.quantity > 0) {
                                MonksEnhancedJournal.emit("purchaseItem",
                                    {
                                        shopid: entry.uuid,
                                        actorid: actor.id,
                                        itemid: id,
                                        quantity: result.quantity,
                                        purchase: true,
                                        user: game.user.id
                                    }
                                );
                            }
                            if (item.consumable)
                                result.quantity = 0;
                        }
                        return result;
                    }
                }
            } else if (result !== false && result != null) {
                log("result", result);
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotAddLessThanOne"));
            }
        }
        return false;
    }

    async importActorItems() {
        let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = actorLink.id ? game.actors.get(actorLink.id) : await fromUuid(actorLink);

            if (actor) {
                let items = actor.items
                    .filter(item => {
                        // Weapons are fine, unless they're natural
                        let result = false;
                        if (item.type == 'weapon') {
                            result = item.system.weaponType != 'natural' && item.system?.type?.value != 'natural';
                        }
                        // Equipment's fine, unless it's natural armor
                        else if (item.type == 'equipment') {
                            if (!item.system.armor)
                                result = true;
                            else
                                result = item.system.armor.type != 'natural';
                        } else
                            result = !(['class', 'spell', 'feat', 'action', 'lore', 'melee'].includes(item.type));

                        return result;
                    }).map(i => {
                        return foundry.utils.mergeObject(i.toObject(), { cost: getValue(i.data, pricename(), "") });
                    });

                if (items.length > 0) {
                    let shopitems = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'items') || {});
                    shopitems = foundry.utils.mergeObject(shopitems, items);
                    this.document.setFlag('monks-enhanced-journal', 'items', shopitems);
                }
            }
        }
    }

    async createName() {
        let pack = game.packs.get("monks-enhanced-journal.shop-names");
        await pack.getDocuments();

        let first = pack.contents.find(c => c._id == "LR5awmz5mlyapceL");
        let second = pack.contents.find(c => c._id == "wCg3vbUVBWB6g0TG");

        let firstName = await first.draw({ displayChat: false });
        let secondName = await second.draw({ displayChat: false });

        return `${firstName.results[0].description} ${secondName.results[0].description}`;
    }

    static onRollItem(event, target) {
        this.rollTable("items", false, event, target);
    }

    static async onToggleConsumable(event, target) {
        let id = target.closest('li.item').dataset.id;
        let collection = target.closest('.item-list').dataset.container;

        let items = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', collection) || {});
        if (["items"].includes(collection)) {
            if (items[id]) {
                items[id].consumable = !items[id].consumable;
                await this.document.setFlag('monks-enhanced-journal', collection, items);
            }
        }
    }

    async convertItems(formData) {
        for (let [k, v] of Object.entries(formData.adjustment)) {
            if (v.sell == undefined)
                delete formData.adjustment[k].sell;
            if (v.buy == undefined)
                delete formData.adjustment[k].buy;

            if (Object.keys(formData.adjustment[k]).length == 0)
                delete formData.adjustment[k];
        }

        let adjustment = Object.assign({}, setting("adjustment-defaults"), formData.adjustment || {});

        let items = this.options.document.getFlag('monks-enhanced-journal', 'items') || {};

        for (let item of Object.values(items)) {
            let sell = adjustment[item.type]?.sell ?? adjustment.default.sell ?? 1;
            let price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
            let cost = Math.max(Math.ceil((price.value * sell), 1)) + " " + price.currency;
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.cost", cost);
        }

        await this.options.document.update({ "flags.monks-enhanced-journal.items": items }, { focus: false });
    }
}
