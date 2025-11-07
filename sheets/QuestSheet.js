import { Objectives } from "../apps/objectives.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { getValue, setValue, MEJHelpers } from "../helpers.js";

export class QuestSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        if (this.document.flags["monks-enhanced-journal"].status == undefined && this.document.flags["monks-enhanced-journal"].completed)
            this.document.flags["monks-enhanced-journal"].status = 'completed';
    }

    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.quest",
            icon: "fa-solid fa-map-signs",
        },
        actions: {
            createObjective: QuestSheet.onCreateObjective,
            editObjective: QuestSheet.onEditObjective,
            deleteObjective: QuestSheet.onDeleteObjective,
            changeReward: QuestSheet.onChangeReward,
            createReward: QuestSheet.onCreateReward,
            deleteReward: QuestSheet.onDeleteReward,
            rollItems: QuestSheet.onRollLoot,
            refillLoot: QuestSheet.onRefillItems,
            assignItems: QuestSheet.onAssignItems,
            assignXP: QuestSheet.onAssignXP,
            refillItem: QuestSheet.onRefillItem
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/quest.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-detailed-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-objectives.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-rewards.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-reward-items.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-relationships.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-notes.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-currency.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".editor-display",
                ".editor-content",
                ".objective-items .item-list",
                ".reward-container .details-section",
                ".reward-container .reward-items .item-list",
                ".relationships .item-list"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "objectives", icon: "fa-solid fa-users-viewfinder" },
                { id: "rewards", icon: "fa-solid fa-award" },
                { id: "relationships", icon: "fa-solid fa-users" },
                { id: "notes", icon: "fa-solid fa-paperclip" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    static get type() {
        return 'quest';
    }

    static get defaultObject() {
        return { rewards: [], objectives: [], seen: false, status: 'inactive' };
    }

    /*
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.sheettype.quest"),
            template: "modules/monks-enhanced-journal/templates/sheets/quest.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".quest-container" },
                { dragSelector: ".document.item", dropSelector: ".quest-container" },
                { dragSelector: ".reward-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".objective-items .item-list .item", dropSelector: ".quest-container" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".objective-items", ".reward-container .reward-items > .item-list", ".tab.description .tab-inner"]
        });
    }
    */

    getCurrentRewardId() {
        return game.user.getFlag('monks-enhanced-journal', `reward${this.document.id}`) || "";
    }

    async setCurrentRewardId(value) {
        await game.user.setFlag('monks-enhanced-journal', `reward${this.document.id}`, value);
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        let objectives = this.document.getFlag('monks-enhanced-journal', "objectives") || {};

        if (objectives instanceof Array) {
            let newObjectives = {};
            for (let objective of objectives) {
                newObjectives[objective.id] = objective;
            }

            objectives = newObjectives;
            await this.document.setFlag("monks-enhanced-journal", "objectives", objectives);
        }

        let rewards = this.document.getFlag('monks-enhanced-journal', "rewards") || {};

        if (rewards instanceof Array) {
            let newRewards = {};
            for (let reward of rewards) {
                newRewards[reward.id] = reward;
            }

            rewards = newRewards;
            await this.document.setFlag("monks-enhanced-journal", "rewards", rewards);
        }

        let items = {};
        let changed = false;
        for (let reward of Object.values(rewards)) {
            if (!!reward.items) {
                reward.oldItems = reward.items || [];
                reward.itemIds = [];
                for (let item of (reward.items || [])) {
                    if (item._id && !Object.keys(items).includes(item._id)) {
                        items[item._id] = item;
                        reward.itemIds.push(item._id);
                    }
                }
                delete reward.items;
                reward["-=items"] = null;
                changed = true;
            }
        }
        if (changed) {
            await this.document.setFlag('monks-enhanced-journal', "rewards", rewards);
            await this.document.setFlag('monks-enhanced-journal', "items", foundry.utils.mergeObject((this.document.getFlag('monks-enhanced-journal', "items") || {}), items));
        }

        context.statusOptions = {
            inactive: "MonksEnhancedJournal.queststatus.unavailable",
            available: "MonksEnhancedJournal.queststatus.available",
            inprogress: "MonksEnhancedJournal.queststatus.inprogress",
            completed: "MonksEnhancedJournal.queststatus.completed",
            failed: "MonksEnhancedJournal.queststatus.failed"
        };

        context.objectives = await Promise.all(foundry.utils.duplicate(Object.values(objectives))?.filter(o => {
            return this.document.isOwner || o.available;
        }).map(async (o) => {
            let counter = { counter: ($.isNumeric(o.required) ? (o.done || 0) + '/' + o.required : '') };

            o.enrichedText = await foundry.applications.ux.TextEditor.implementation.enrichHTML(o.content, {
                relativeTo: this.document,
                secrets: this.document.isOwner,
                async: true
            })

            return foundry.utils.mergeObject(o, counter);
        }));

        context.useobjectives = setting('use-objectives');
        context.canxp = game.modules.get("monks-tokenbar")?.active && this.document.isOwner;

        context.rewards = Object.values(rewards).map(r => {
            return { id: r.id, name: r.name, visible: r.visible, awarded: r.awarded };
        });
        if (context.rewards.length) {
            context.reward = this.getReward();
        }

        context.groups = await this.getItemGroups();
        // Remove any items and groups that aren't part of this reward
        if (context.reward) {
            for (let key of Object.keys(context.groups)) {
                context.groups[key].items = context.groups[key].items.filter(i => context.reward.itemIds?.includes(i._id));
                if (context.groups[key].items.length == 0)
                    delete context.groups[key];
            }
        }

        context.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: context.reward?.currency[c.id] ?? 0 };
        });

        context.relationships = await this.getRelationships();

        let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = actorLink.id ? game.actors.find(a => a.id == actorLink.id) : await fromUuid(actorLink);

            if (actor && actor.testUserPermission(game.user, "OBSERVER")) {
                context.actor = { uuid: actor.uuid, name: actor.name, img: actor.img };
            }
        }
        context.canViewActor = !!context.actor;

        context.has = {
            objectives: context.objectives?.length > 0,
            rewards: context.rewards?.length > 0,
            items: Object.keys(context.groups || {}).length > 0,
            relationships: Object.keys(context.relationships || {})?.length > 0
        }

        context.fields = [
            { id: 'source', label: "MonksEnhancedJournal.Source", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.source") },
            { id: 'status', label: "MonksEnhancedJournal.Status", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.status"), type: 'list', list: context.statusOptions }
        ];
        if (this.document.isOwner) {
            context.fields = context.fields.concat([
                { id: 'display', label: "MonksEnhancedJournal.DisplayInNotifications", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.display"), type: 'checkbox' }
            ]);
        }
        context.placeholder = "MonksEnhancedJournal.QuestName";

        context.hasShowToPlayers = true;
        context.showingToPlayers = this.document.parent.ownership["default"] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

        return context;
    }

    /*
    async getRewardData() {
        let rewards;

        if (this.document.flags["monks-enhanced-journal"].rewards == undefined &&
                (this.document.flags["monks-enhanced-journal"].items != undefined ||
            this.document.flags["monks-enhanced-journal"].xp != undefined ||
            this.document.flags["monks-enhanced-journal"].additional != undefined)) {
            if (this.document.isOwner) {
                rewards = this.convertRewards();
                //this.document.flags['monks-enhanced-journal'].reward = rewards[0].id;
                this.document.setFlag('monks-enhanced-journal', 'rewards', rewards);
                game.user.setFlag('monks-enhanced-journal', `reward${this.document.id}`, rewards[0].id);
            }
        } else {
            rewards = this.document.flags["monks-enhanced-journal"].rewards || [];
            rewards = rewards.map(reward => {
                if (reward.currency instanceof Array)
                    reward.currency = reward.currency.reduce((a, v) => ({ ...a, [v.name]: v.value }), {});
                return reward;
            }).filter(r => game.user.isGM || r.visible);
        }

        return rewards;
    }
    */

    /*
    convertRewards() {
        let currency = MonksEnhancedJournal.currencies.reduce((a, v) => ({ ...a, [v.id]: this.document.flags["monks-enhanced-journal"][v.id] }), {});
        return [{
            id: makeid(),
            name: i18n("MonksEnhancedJournal.Rewards"),
            active: true,
            visible: false,
            items: this.document.flags["monks-enhanced-journal"].items,
            xp: this.document.flags["monks-enhanced-journal"].xp,
            additional: this.document.flags["monks-enhanced-journal"].additional,
            currency: currency,
            hasCurrency: Object.keys(currency).length > 0
        }];
    }
    */

    getReward() {
        let rewards = this.document.getFlag('monks-enhanced-journal', "rewards") || {};
        let id = this.getCurrentRewardId();
        let reward = rewards[id];
        if (reward == undefined && Object.keys(rewards).length > 0) {
            reward = rewards[Object.keys(rewards)[0]];
            this.setCurrentRewardId(reward.id);
        }

        return reward;
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

    async activateListeners(html) {
        await super.activateListeners(html);

        let status = foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.status");
        $("select[name='flags.monks-enhanced-journal.status']", html).css({ "border-left": `8px solid rgb(var(--mej-quest-status-${status}))`, "padding-left": "0px"});
    }

    _dragDrop(html) {
        super._dragDrop(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".reward-items.items-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropRewardItem.bind(this)
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
    }

    /*async _onSubmit(ev) {
        let data = foundry.utils.expandObject(super._getSubmitData());

        let items = null;
        if (data.reward.items) {
            for (let [k, v] of Object.entries(data.reward.items)) {
                let values = (v instanceof Array ? v : [v]);
                if (items == undefined) {
                    items = values.map(item => { let obj = {}; obj[k] = item; return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        items[i][k] = values[i];
                    }
                }
            }
            delete data.reward.items;
        }

        //save the reward data
        let rewards = foundry.utils.duplicate(this.getRewardData());
        let reward = this.getReward(rewards);//rewards.find(r => r.id == this.document.getFlag('monks-enhanced-journal', 'reward'));
        if (reward) {
            if (items) {
                for (let item of items) {
                    let olditem = reward.items.find(i => i.id == item.id);
                    if (olditem) {
                        olditem = Object.assign(olditem, item);
                        if (!olditem.assigned && olditem.received)
                            delete olditem.received;
                    }
                    else
                        reward.items.push(item);
                }
            }

            if (!reward.active && data.reward.active) {
                //make sure there's only one active reward
                for (let r of rewards)
                    r.active = false;
            }
            reward = foundry.utils.mergeObject(reward, data.reward);
            //$('.reward-list .journal-tab[data-reward-id="' + reward.id + '"] .tab-content', this.trueElement).html(reward.name);
            await this.document.setFlag("monks-enhanced-journal", "rewards", rewards);
        }

        let objectives = null;
        if (data.objectives) {
            for (let [k, v] of Object.entries(data.objectives)) {
                let values = (v instanceof Array ? v : [v]);
                if (objectives == undefined) {
                    objectives = values.map(objective => { let obj = {}; obj[k] = objective; return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        objectives[i][k] = values[i];
                    }
                }
            }
            delete data.objectives;
        }

        if (objectives) {
            let oldobjectives = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'objectives'));
            for (let objective of objectives) {
                let oldobj = oldobjectives.find(i => i.id == objective.id);
                if (oldobj)
                    oldobj = Object.assign(oldobj, objective);
                else
                    oldobjectives.push(objective);
            }
            await this.document.setFlag("monks-enhanced-journal", "objectives", oldobjectives);
        }

        return await super._onSubmit(ev);
    }*/

    _prepareSubmitData(event, form, formData, updateData) {
        const fd = foundry.utils.expandObject(formData.object);

        const submitData = super._prepareSubmitData(event, form, formData, updateData);

        // Make sure to include all the reward data if you're updating data
        let rewards = foundry.utils.mergeObject(foundry.utils.getProperty(submitData, "flags.monks-enhanced-journal.rewards") || {}, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.rewards") || {}, { overwrite: false });
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.rewards", rewards);

        // Make sure to include all the objectives data if you're updating data
        let objectives = foundry.utils.mergeObject(foundry.utils.getProperty(submitData, "flags.monks-enhanced-journal.objectives") || {}, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.objectives") || {}, { overwrite: false });
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.objectives", objectives);

        return submitData;
    }

    static async onChangeReward(event, target) {
        let id = target.closest('.reward-tab').dataset.rewardId;
        await this.changeReward.call(this, id);
    }

    async changeReward(id) {
        if (id == undefined)
            return;

        await this.setCurrentRewardId(id);
        this.render(true);
    }

    static async onCreateReward(event, target) {
        let rewards = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'rewards') || {});
        let currency = MonksEnhancedJournal.currencies.reduce((a, v) => ({ ...a, [v.id]: 0 }), {});
        let reward = {
            id: makeid(),
            name: i18n("MonksEnhancedJournal.Rewards"),
            xp: "",
            additional: "",
            currency: currency,
            itemIds: []
        };
        rewards[reward.id] = reward;
        await this.document.setFlag('monks-enhanced-journal', 'rewards', rewards);

       await this.changeReward(reward.id);

        return reward;
    }

    static async onDeleteReward(event, target) {
        let id = target.closest('.reward-tab').dataset.rewardId;

        let rewards = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'rewards') || {});
        let reward = rewards[id];

        if (!reward)
            return;

        let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};
        for (let itemId of reward.itemIds || []) {
            delete items[itemId];
            items[`-=${itemId}`] = null;
        }
        await this.document.setFlag('monks-enhanced-journal', 'items', items);

        this.deleteItem(id, "rewards");

        if (id == this.getCurrentRewardId()) {
            let newid = rewards[0]?.id;
            this.changeReward(newid);
        }
    }

    /*
    async loadRewards(id) {
        if (id == undefined)
            id = game.user.getFlag('monks-enhanced-journal', `reward${this.document.id}`);

        $('.reward-container', this.trueElement).empty();

        let rewards = this.getRewardData();
        let reward = rewards.find(r => r.id == id);
        if (reward == undefined) {
            reward = rewards[0];
            if (reward == undefined)
                return;
            await game.user.setFlag('monks-enhanced-journal', `reward${this.document.id}`, reward.id);
        }
        let template = "modules/monks-enhanced-journal/templates/reward.html";

        let html = await foundry.applications.handlebars.renderTemplate(template, reward);
        html = $(html);

        $('.reward-list .journal-tab[data-reward-id="' + id + '"]', this.trueElement).addClass('active').siblings().removeClass('active');

        $('.reward-container', this.trueElement).append(html);

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.assign-items', html).click(this.assignItems.bind(this));
    }*/

    /*
    async render(data) {
        let element = await super.render(data);

        await this.loadRewards(0);

        return element;
    }

    async refresh() {
        await this.loadRewards(0);
    }*/

    /*
    async deleteItem(id, container) {
        if (container == 'items') {
            let rewards = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].rewards);
            let reward = rewards.find(r => r.id == game.user.getFlag("monks-enhanced-journal", `reward${this.document.id}`));
            reward.items.findSplice(i => i.id == id || i._id == id);
            this.document.setFlag('monks-enhanced-journal', "rewards", rewards);
        } else
            super.deleteItem(id, container);
    }
    */

    _canDragItemStart(selector) {
        return game.user.isGM || this.document.isOwner;
    }

    _onDragItemsStart(event) {
        const li = event.target.closest('.item');

        const dragData = { from: 'monks-enhanced-journal' };

        if (li.dataset.document == 'Item') {
            let id = li.dataset.id;

            let reward = this.getReward();
            if (reward == undefined)
                return;

            let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};
            let item = items[id];
            if (!game.user.isGM && (this.document.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.itemId = id;
            dragData.rewardId = reward.id;
            dragData.type = "Item";
            dragData.uuid = this.document.uuid;
            dragData.data = foundry.utils.duplicate(item);
            MonksEnhancedJournal._dragItem = id;
        } else if (li.dataset.document == 'Objective') {
            dragData.id = id;
            dragData.type = "Objective";
        }

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _onDropRewardItem(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Item') {
            if (data.from == this.document.uuid)  //don't drop on yourself
                return;
            if (data.groupSelect) {
                let itemId = data.uuid.substring(0, data.uuid.length - 16);
                for (let item of data.groupSelect) {
                    await this.addItem({ type: "Item", uuid: `${itemId}${item}` });
                }
                game?.MultipleDocumentSelection?.clearAllTabs();
            } else
                this.addItem(data);
        } else if (data.type == 'Objective') {
            //re-order objectives
            let objectives = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal']?.objectives || []);

            let from = objectives.findIndex(a => a.id == data.id);
            let to = objectives.length - 1;
            if (!$(event.target).hasClass('objectives')) {
                const target = event.target.closest(".item") || null;
                if (data.id === target.dataset.id) return; // Don't drop on yourself
                to = objectives.findIndex(a => a.id == target.dataset.id);
            }
            if (from == to)
                return;

            objectives.splice(to, 0, objectives.splice(from, 1)[0]);

            this.document.flags['monks-enhanced-journal'].objectives = objectives;
            this.document.setFlag('monks-enhanced-journal', 'objectives', objectives);
        } else if (data.type == 'Folder') {
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

        log('drop data', event, data);
    }

    async addItem(data) {
        let items = await super.addItem(data);

        if (items.length) {
            let rewardId = this.getCurrentRewardId();
            let rewards = this.document.getFlag('monks-enhanced-journal', 'rewards') || {};

            let reward = rewards[rewardId];
            if (reward == undefined) {
                reward = await this.constructor.onCreateReward.call(this);
                rewardId = reward.id;
            }

            let rewardItemIds = reward.itemIds || [];
            for (let item of items) {
                if (rewardItemIds.includes(item._id))
                    return;

                rewardItemIds.push(item._id);
            }
            reward.itemIds = rewardItemIds;
            await this.document.setFlag('monks-enhanced-journal', 'rewards', rewards);
        }
    }

    static async onChangePlayerPermissions(event, target) {
        let ownership = this.document.parent.ownership;
        let showing = ownership['default'] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        ownership['default'] = (showing ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
        await this.document.parent.update({ ownership: ownership });
        this.render(true);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || {})[id];

        if (item) {
            let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining");
            let result = await QuestSheet.confirmQuantity(item, max, "transfer", false);
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

    static onCreateObjective(event, target) {
        let objective = { status: false };
        if (this.document.flags["monks-enhanced-journal"].objectives == undefined)
            this.document.flags["monks-enhanced-journal"].objectives = {};
        new Objectives({ document: objective, journalentry: this }).render(true);
    }

    static onEditObjective(event, target) {
        let item = target.closest('.item');
        let objectiveId = item.dataset.id;
        let objectives = this.document.flags["monks-enhanced-journal"].objectives || {};
        let objective = objectives[objectiveId];
        if (objective != undefined)
            new Objectives({ document: objective, journalentry: this }).render(true);
    }

    static onDeleteObjective(event, target) {
        let li = target.closest('.item');
        let id = li.dataset.id;
        this.deleteItem(id, "objectives");
    }

    async addActor(data) {
        let actor = await this.getItemData(data);

        if (actor) {
            this.document.update({ 'flags.monks-enhanced-journal.actor': actor, 'flags.monks-enhanced-journal.source': actor.name });
        }
    }

    static onRollLoot(event, target) {
        this.rollTable("items", false, event, target);
    }

    static onRefillItems(event, target) {
        this.refillItems("all");
    }

    static onRefillItem(event, target) {
        let li = target.closest('.item');
        let id = li.dataset.id;
        this.refillItems(id);
    }

    static async onAssignItems(event, target) {
        let reward = this.getReward();
        this.constructor.assignItemsFromDocument.call(this.document, reward.id);
    }

    static async assignItemsFromDocument(rewardId) {
        let rewards = foundry.utils.duplicate(this.getFlag('monks-enhanced-journal', 'rewards') || {});
        if (Object.keys(rewards).length == 0)
            return;

        let reward = rewardId ? rewards[rewardId] : Object.values(rewards)[0];

        if (Object.keys(rewards).length > 1 && !rewardId) {
            let rewardClick = (rewardId, html) => {
                return rewardId;
            };

            let buttons = Object.values(rewards).filter(r => r.awarded).map(r => {
                return {
                    action: r.id,
                    label: r.name,
                    callback: rewardClick.bind(this, r.id)
                }
            });
            rewardId = await foundry.applications.api.DialogV2.wait({
                window: {
                    title: `Which reward are you assigning?`,
                },
                content: `Please pick a reward to assign:</br></br>`,
                buttons,
                close: () => { return null; },
                render: (event, dialog) => {
                    $(dialog.element).css("flex-direction", "column");
                }
            });
            reward = rewards[rewardId];
            if (!reward)
                return;
        }

        let items = this.getFlag('monks-enhanced-journal', 'items') || {};
        let rewardItems = {};
        for (let item of Object.values(items)) {
            if (reward.itemIds?.includes(item._id))
                rewardItems[item._id] = item;
        }

        let assignedItems = await super.assignItems(foundry.utils.duplicate(rewardItems), reward.currency) || {};
        // Figure out which rewardItems no longer exist in assignedItems and delete them

        let assignedIds = Object.keys(assignedItems);
        reward.itemIds = assignedIds;
        for (let key of Object.keys(rewardItems)) {
            if (!assignedIds.includes(key)) {
                delete items[key];
                items[`-=${key}`] = null;
            }
        }
        this.setFlag('monks-enhanced-journal', 'items', items);

        for (let key of Object.keys(reward.currency))
            reward.currency[key] = 0;

        this.setFlag('monks-enhanced-journal', 'rewards', rewards);
    }

    static onAssignXP(event, target) {
        if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
            let reward = this.getReward();
            game.MonksTokenBar.assignXP(null, { xp: reward.xp });
        }
    }

    async doClearAllItems(clearLocked = false) {
        let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};
        let reward = this.getReward();
        for (let [k, v] of Object.entries(items)) {
            if (reward.itemIds?.includes(k))
                await this.document.unsetFlag('monks-enhanced-journal', 'items.' + k);
        }

        let rewards = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'rewards') || {});
        reward = rewards[this.getCurrentRewardId()];
        if (reward) {
            reward.itemIds = [];
            await this.document.setFlag('monks-enhanced-journal', 'rewards', rewards);
        }
    }

    getItemList() {
        let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};

        let rewards = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'rewards') || {});
        let reward = rewards[this.getCurrentRewardId()];
        if (reward) {
            let rewardItems = {};
            for (let item of Object.values(items)) {
                if (reward.itemIds?.includes(item._id))
                    rewardItems[item._id] = item;
            }
            return rewardItems;
        }
        return super.getItemList();
    }
}
