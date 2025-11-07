import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CustomisePage extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options) {
        super(options);
        this.document = options.document;
    }

    static DEFAULT_OPTIONS = {
        id: "customise-page",
        tag: "form",
        classes: ["customise-page", "sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form", ".monks-journal-sheet"],
            //icon: "fa-solid fa-align-justify",
            title: "Customise Page"
        },
        actions: {
            reset: CustomisePage.onResetDefaults,
            convert: CustomisePage.onConvertItems
        },
        position: {
            width: 600,
            height: 500
        },
        form: {
            handler: CustomisePage.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/customise/customise-page.html",
            templates: [
                "templates/generic/tab-navigation.hbs",
                "modules/monks-enhanced-journal/templates/customise/adjustment.hbs",
                "modules/monks-enhanced-journal/templates/customise/attributes.hbs",
                "modules/monks-enhanced-journal/templates/customise/tabs.hbs"
            ],
            scrollable: [
                ".item-list"
            ]
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    get type() {
        return this.options.journalsheet.constructor.type;
    }

    /*
    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        parts.main.templates.push(`modules/monks-enhanced-journal/templates/customise/${this.type}.html`);
        return parts;
    }
    */

    /*
    _prepareTabs(group) {
        let tabs = super._prepareTabs(group);

        let sheetTabs = this.sheetSettings().tabs;
        if (!!sheetTabs) {
            for (let [key, value] of Object.entries(this.sheetSettings().tabs)) {
                if (value.shown === false) {
                    delete tabs[key];
                }
            }
        }

        return tabs;
    }
    */

    /*
    tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "tabs" }],
            scrollY: [".item-list"],
            */

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "form":
                this._prepareBodyContext(context, options);
                break;
            case "footer":
                context.buttons = this.prepareButtons();
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        context.generalEdit = false;

        let settings = this.options.journalsheet.sheetSettings();
        let sheetSettings = {};
        sheetSettings[this.type] = settings;

        let settingContext = sheetSettings[this.type];

        // Due to the nature of adjustments, we need to overwrite the adjustment settings to ensure all types are present
        if (settingContext.adjustment) {
            // Get list of Item types for this system
            const original = Object.keys(game.system?.documentTypes?.Item || {});
            let types = original.filter(x => MonksEnhancedJournal.includedTypes.includes(x));
            types = types.reduce((obj, t) => {
                const label = CONFIG.Item?.typeLabels?.[t] ?? t;
                obj[t] = { name: game.i18n.has(label) ? game.i18n.localize(label) : t };
                return obj;
            }, {});

            // Get the default adjustment settings, and set the current adjustment settings to default
            let defaultAdjustment = setting("adjustment-defaults");
            let adjustments = {
                default: {}, ...foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'adjustment') || {})
            };

            for (let t of Object.keys(types)) {
                let adj = adjustments[t] || { sell: null, buy: null };
                let defValue = defaultAdjustment[t] || { sell: null, buy: null };
                adjustments[t] = { ...adj, default: defValue };
            }
            adjustments.default.default = defaultAdjustment.default || { sell: 1, buy: 0.5 };

            foundry.utils.mergeObject(adjustments, types);

            settingContext.adjustment = Object.keys(adjustments).map(k => {
                return { id: k, ...adjustments[k] };
            }).sort((a, b) => {
                if (a.id === "default") return -1;
                if (b.id === "default") return 1;
                return a.name.localeCompare(b.name);
            });
        } else if (settingContext.attributes) {
            settingContext.attributes = MonksEnhancedJournal.convertObjectToArray(settingContext.attributes);
        }

        context.settings = Object.entries(settingContext).map(([key, value]) => {
            if (!["adjustment", "attributes", "tabs"].includes(key)) return null;
            return {
                id: key,
                group: this.type,
                active: false,
                label: i18n(`MonksEnhancedJournal.setting.${key}`),
                icon: (key === "adjustments" ? "fas fa-coins" : (key === "attributes" ? "fas fa-list" : (key === "tabs" ? "fas fa-folder-closed" : ""))),
                partial: `modules/monks-enhanced-journal/templates/customise/${key}.hbs`,
                context: value
            }
        }).filter(s => !!s);
        context.settings[0].active = true;

        context.type = this.type;

        return context;
    }

    prepareButtons() {
        return [
            {
                type: "button",
                icon: "fas fa-undo",
                label: "Reset Defaults",
                action: "reset"
            },
            {
                type: "submit",
                icon: "far fa-save",
                label: "Save Changes",
            }
        ];
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        $('.sell-field', this.element).on("blur", this.validateField.bind(this));
    };

    validateField(event) {
        let val = parseFloat($(event.currentTarget).val());
        if (!isNaN(val) && val < 0) {
            $(event.currentTarget).val('');
        }
    }

    static async onSubmitForm(event, form, formData) {
        let defaultSettings = this.options.journalsheet.constructor.sheetSettings() || {};
        let submitData = foundry.utils.expandObject(formData.object);
        let settings = submitData.sheetSettings[this.options.journalsheet.constructor.type] || {};

        // find all values in settings that are not the same as the default
        let changed = {};
        for (let [k, v] of Object.entries(settings)) {
            for (let [k2, v2] of Object.entries(v)) {
                for (let [k3, v3] of Object.entries(v2)) {
                    if (defaultSettings[k][k2][k3] != v3) {
                        changed[k] = changed[k] || {};
                        changed[k][k2] = v2;
                    }
                }
            }
        }

        await this.document.unsetFlag("monks-enhanced-journal", "sheet-settings");
        await this.document.setFlag("monks-enhanced-journal", "sheet-settings", changed, { diff: false });
        this.options.journalsheet.render(true);
    }

    static async onResetDefaults(event) {
        await this.document.unsetFlag("monks-enhanced-journal", "sheet-settings");
        this.options.journalsheet.render(true);
        this.render(true);
    }

    static async onConvertItems(event, target) {
        const fd = new foundry.applications.ux.FormDataExtended(this.element);
        let data = foundry.utils.expandObject(fd.object);

        this.options.journalsheet.convertItems(data);

        /*
        let dataAdjustment = data.sheetSettings.shop.adjustment;

        for (let [k, v] of Object.entries(dataAdjustment)) {
            if (v.sell == undefined)
                delete dataAdjustment[k].sell;
            if (v.buy == undefined)
                delete dataAdjustment[k].buy;

            if (Object.keys(dataAdjustment[k]).length == 0)
                delete dataAdjustment[k];
        }

        let defaultSettings = this.options.journalsheet.constructor.sheetSettings() || {};
        let adjustment = Object.assign({}, defaultSettings, { adjustment: dataAdjustment });

        let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};

        for (let item of Object.values(items)) {
            let sell = adjustment[item.type]?.sell ?? adjustment.default.sell ?? 1;
            let price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
            let cost = Math.max(Math.ceil((price.value * sell), 1)) + " " + price.currency;
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.cost", cost);
        }

        await this.document.update({ "flags.monks-enhanced-journal.items": items }, { focus: false });
        */
    }
}