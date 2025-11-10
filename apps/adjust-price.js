import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';
import { MEJHelpers } from '../helpers.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class AdjustPrice extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.document = options.document;
    }

    static DEFAULT_OPTIONS = {
        id: "adjust-price",
        tag: "form",
        classes: ["adjust-price"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.AdjustPrices"
        },
        actions: {
            cancel: AdjustPrice.onClose,
            reset: AdjustPrice.resetValues,
            convert: AdjustPrice.convertItems
        },
        position: { width: 400 },
        form: {
            handler: AdjustPrice.onSubmitForm,
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/adjust-price.html"
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

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

        let adjustments = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'adjustment') || {});
        for (let t of Object.keys(types)) {
            let adj = adjustments[t] || { sell: null, buy: null };
            let defValue = defaultAdjustment[t] || { sell: null, buy: null };
            adjustments[t] = { ...adj, default: defValue };
        }
        foundry.utils.setProperty(adjustments, "default.default", defaultAdjustment.default || { sell: 1, buy: 0.5 });
        foundry.utils.mergeObject(adjustments, types);

        adjustments = Object.keys(adjustments).map(k => {
            return { id: k, ...adjustments[k] };
        }).sort((a, b) => {
            if (a.id === "default") return -1;
            if (b.id === "default") return 1;
            return a.name.localeCompare(b.name);
        });

        return foundry.utils.mergeObject(context, {
            adjustments,
            showConvert: !!this.options.document
        });
    }

    prepareButtons() {
        let buttons = [
            {
                type: "submit",
                icon: "far fa-check",
                label: "Save",
            },
            {
                type: "button",
                icon: "fas fa-times",
                label: "Cancel",
                action: "cancel"
            },
        ];

        if (!!this.options.document) {
            buttons.unshift({
                type: "button",
                icon: "fas fa-undo",
                label: "Reset",
                action: "reset"
            });
        }

        return buttons;
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        $('.sell-field', this.element).on("blur", this.validateField.bind(this));
    }

    static resetValues(event) {
        event.stopPropagation();
        event.preventDefault();

        $('.sell-field', this.element).val('');
        $('.buy-field', this.element).val('');
    }

    validateField(event) {
        let val = parseFloat($(event.currentTarget).val());
        if (!isNaN(val) && val < 0) {
            $(event.currentTarget).val('');
        }
    }

    static async onSubmitForm(event, form, formData) {
        let submitData = foundry.utils.expandObject(formData.object);
        for (let [k, v] of Object.entries(submitData.adjustment)) {
            if (v.sell == undefined)
                delete submitData.adjustment[k].sell;
            if (v.buy == undefined)
                delete submitData.adjustment[k].buy;

            if (Object.keys(submitData.adjustment[k]).length == 0)
                delete submitData.adjustment[k];
        }

        if (this.options.document) {
            await this.options.document.unsetFlag('monks-enhanced-journal', 'adjustment');
            await this.options.document.setFlag('monks-enhanced-journal', 'adjustment', submitData.adjustment);
        } else
            await game.settings.set("monks-enhanced-journal", "adjustment-defaults", submitData.adjustment, { diff: false });
    }

    static async convertItems(event, target) {
        const fd = new foundry.applications.ux.FormDataExtended(this.element);
        let data = foundry.utils.expandObject(fd.object);

        this.options.journalsheet.convertItems(data);

        /*
        for (let [k, v] of Object.entries(data.adjustment)) {
            if (v.sell == undefined)
                delete data.adjustment[k].sell;
            if (v.buy == undefined)
                delete data.adjustment[k].buy;

            if (Object.keys(data.adjustment[k]).length == 0)
                delete data.adjustment[k];
        }

        let adjustment = Object.assign({}, setting("adjustment-defaults"), data.adjustment || {});

        let items = this.options.document.getFlag('monks-enhanced-journal', 'items') || {};

        for (let item of Object.values(items)) {
            let sell = adjustment[item.type]?.sell ?? adjustment.default.sell ?? 1;
            let price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
            let cost = Math.max(Math.ceil((price.value * sell), 1)) + " " + price.currency;
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.cost", cost);
        }

        await this.options.document.update({ "flags.monks-enhanced-journal.items": items }, { focus: false });
        */
    }

    static onClose(event, form) {
        this.close();
    }
}