import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CustomisePages extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);

        this.sheetSettings = {};
        let types = MonksEnhancedJournal.getDocumentTypes();
        for (let page of CustomisePages.typeList) {
            this.sheetSettings[page] = {};
            let cls = types[page];
            if (!cls) continue;
            if (cls.sheetSettings != undefined) {
                let settings = cls.sheetSettings();
                this.sheetSettings[page] = settings;
            }
        }
    }

    static DEFAULT_OPTIONS = {
        id: "customise-pages",
        tag: "form",
        classes: ["customise-page", "sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "Customise Pages"
        },
        actions: {
            reset: CustomisePages.onResetDefaults,
            addAttribute: CustomisePages.onAddAttribute,
            removeAttribute: CustomisePages.onRemoveAttribute
        },
        position: { width: 800 },
        form: {
            handler: CustomisePages.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/customise/customise-pages.html",
            templates: [
                "modules/monks-enhanced-journal/templates/customise/customise-page.html",
                "templates/generic/tab-navigation.hbs",
                "modules/monks-enhanced-journal/templates/customise/adjustment.hbs",
                "modules/monks-enhanced-journal/templates/customise/attributes.hbs",
                "modules/monks-enhanced-journal/templates/customise/tabs.hbs"
            ],
            scrollable: [
                ".sidebar .tabs",
                ".item-list"
            ]
        }
    };

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "main":
                this._prepareBodyContext(context, options);
                break;
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        context.generalEdit = true;
        context.sheettypes = CustomisePages.typeList;
        context.sheetSettings = foundry.utils.duplicate(this.sheetSettings);

        for (let page of CustomisePages.typeList) {
            let index = 0;
            context.sheetSettings[page] = Object.entries(context.sheetSettings[page]).map(([key, value]) => {

                if (!["adjustment", "attributes", "tabs"].includes(key)) return;

                let contextValue = foundry.utils.duplicate(value);
                if (key == "attributes") {
                    contextValue = MonksEnhancedJournal.convertObjectToArray(contextValue);
                } else if (key == "adjustment") {
                    let defaultAdjustment = setting("adjustment-defaults");
                    contextValue = foundry.utils.mergeObject(foundry.utils.duplicate(defaultAdjustment), contextValue);

                    contextValue = MonksEnhancedJournal.convertObjectToArray(contextValue).sort((a, b) => {
                        if (a.id === "default") return -1;
                        if (b.id === "default") return 1;
                        return a.name.localeCompare(b.name);
                    });
                }

                return {
                    id: key,
                    group: page,
                    active: this.tabGroups[page] ? this.tabGroups[page] == key : (index++ == 0),
                    label: i18n(`MonksEnhancedJournal.setting.${key}`),
                    icon: (key === "adjustments" ? "fas fa-coins" : (key === "attributes" ? "fas fa-list" : (key === "tabs" ? "fas fa-folder-closed" : ""))),
                    partial: `modules/monks-enhanced-journal/templates/customise/${key}.hbs`,
                    context: contextValue
                }
            }).filter(s => !!s);
        }

        context.activePage = this.tabGroups["sheet-settings"] ?? Object.keys(context.sheetSettings)[0];

        return context;
    }

    static get typeList() {
        return ["encounter", "event", "organization", "person", "place", "poi", "quest", "shop"];
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".reorder-attribute",
            dropSelector: ".items-list",
            permissions: {
                dragstart: this._canDragStart.bind(this)
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(this.element);

        $('input[name]', this.element).change(this.changeData.bind(this));
    };

    static onAddAttribute(event, target) {
        let attribute = target.dataset.attribute;
        let attributes = foundry.utils.getProperty(this, attribute);

        if (!attributes) return;

        // find the maximum order
        let maxOrder = 0;
        for (let attr of Object.values(attributes)) {
            maxOrder = Math.max(maxOrder, attr.order);
        }

        let newId = foundry.utils.randomID();
        attributes[newId] = { id: newId, name: "", shown: true, full: false, order: maxOrder + 1 };

        this.render(true);
    }

    static onRemoveAttribute(event, target) {
        let key = target.closest('li.item').dataset.id;

        let attribute = key.substring(0, key.lastIndexOf('.'));
        let attributeId = key.substring(key.lastIndexOf('.') + 1);

        let attributes = foundry.utils.getProperty(this, attribute);

        if (!attributes) return;

        delete attributes[attributeId];

        /*
        let parts = key.split('.');
        for (let i = 0; i < parts.length; i++) {
            let p = parts[i];
            const t = getType(this);
            if (!((t === "Object") || (t === "Array"))) break;
            if (i === parts.length - 1) {
                delete this[p];
                break;
            }
            if (p in this) this = this[p];
            else {
                this = undefined;
                break;
            }
        }
        */

        this.render(true);
    }

    changeData(event) {
        let prop = $(event.currentTarget).attr("name");
        if (foundry.utils.hasProperty(this, prop)) {
            let val = $(event.currentTarget).attr("type") == "checkbox" ? $(event.currentTarget).prop('checked') : $(event.currentTarget).val();
            foundry.utils.setProperty(this, prop, val);
        }
    }

    _onDragStart(event) {
        let li = event.currentTarget.closest(".item");
        const dragData = { id: li.dataset.id };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    _canDragStart(selector) {
        return true;
    }

    _onDrop(event) {
        // Try to extract the data
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        // Identify the drop target
        const target = event.target.closest(".item") || null;

        // Call the drop handler
        if (target && target.dataset.id) {
            if (data.id === target.dataset.id) return; // Don't drop on yourself

            let property = event.target.dataset.attribute;
            let attributes = foundry.utils.getProperty(this, property);

            let from = (foundry.utils.getProperty(this, data.id) || {}).order ?? 0;
            let to = (foundry.utils.getProperty(this, target.dataset.id) || {}).order ?? 0;
            log('from', from, 'to', to);

            if (from < to) {
                for (let attr of Object.values(attributes)) {
                    if (attr.order > from && attr.order <= to) {
                        attr.order--;
                    }
                }
                $('.item-list .item[data-id="' + data.id + '"]', this.element).insertAfter(target);
            } else {
                for (let attr of Object.values(attributes)) {
                    if (attr.order < from && attr.order >= to) {
                        attr.order++;
                    }
                }
                $('.item-list .item[data-id="' + data.id + '"]', this.element).insertBefore(target);
            }
            (foundry.utils.getProperty(this, data.id) || {}).order = to;
        }
    }

    static async onSubmitForm(event, form, formData) {
        game.settings.set("monks-enhanced-journal", "sheet-settings", this.sheetSettings, { diff: false });
    }

    static async onResetDefaults(event) {
        let sheetSettings = game.settings.settings.get("monks-enhanced-journal.sheet-settings");
        await game.settings.set("monks-enhanced-journal", "sheet-settings", sheetSettings.default);
        this.sheetSettings = sheetSettings.default;

        this.render(true);
    }
}