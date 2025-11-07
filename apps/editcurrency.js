import { MonksEnhancedJournal, log, error, i18n, setting, makeid } from "../monks-enhanced-journal.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class EditCurrency extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options) {
        super(options);
        this.currency = MonksEnhancedJournal.currencies;
    }

    static DEFAULT_OPTIONS = {
        id: "journal-editcurrency",
        tag: "form",
        classes: ["edit-currency"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.EditCurrency"
        },
        actions: {
            reset: EditCurrency.resetCurrency,
            addCurrency: EditCurrency.addCurrency,
            removeCurrency: EditCurrency.removeCurrency,
        },
        position: { width: 500 },
        form: {
            handler: EditCurrency.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "./modules/monks-enhanced-journal/templates/edit-currency.html",
            scrollable: [
                ".item-list"
            ]
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
        return foundry.utils.mergeObject(context, {
            currency: this.currency
        });
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "MonksEnhancedJournal.SaveChanges",
            },
            {
                type: "button",
                icon: "fas fa-undo",
                label: "MonksEnhancedJournal.ResetDefaults",
                action: "reset"
            },
        ];
    }

    static async onSubmitForm(event, form, formData) {
        let data = this.currency.filter(c => !!c.id && !!c.name);
        game.settings.set('monks-enhanced-journal', 'currency', data);
        this.submitting = true;
    }

    static addCurrency(event, target) {
        this.currency.push({ id: "", name: "", convert: 1 });
        this.refresh();
    }

    changeData(event) {
        let currid = event.currentTarget.closest('li.item').dataset.id;
        let prop = $(event.currentTarget).attr("name");

        let currency = this.currency.find(c => c.id == currid);
        if (currency) {
            let val = $(event.currentTarget).val();
            if (prop == "convert") {
                if (isNaN(val))
                    val = 1;
                else
                    val = parseFloat(val);
            }
            else if (prop == "id") {
                val = val.replace(/[^a-z]\-/gi, '');
                $(event.currentTarget).val(val);
                if (!!this.currency.find(c => c.id == val)) {
                    $(event.currentTarget).val(currid)
                    return;
                }
                $(event.currentTarget.closest('li.item')).attr("data-id", val);
            }

            currency[prop] = val;
        }
    }

    static removeCurrency(event, target) {
        let currid = target.closest('li.item').dataset.id;
        this.currency.findSplice(s => s.id === currid);
        this.refresh();
    }

    static resetCurrency() {
        this.currency = MonksEnhancedJournal.defaultCurrencies;
        this.refresh();
    }

    refresh() {
        this.render(true);
        let that = this;
        window.setTimeout(function () { that.setPosition(); }, 500);
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        $('input[name]', this.element).change(this.changeData.bind(this));
    };
}