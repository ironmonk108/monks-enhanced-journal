import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class TransferCurrency extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor(options = {}) {
        super(options);

        this.loot = this.options.loot;
        this.currency = {};
        this.actor = this.options.actor || game.user.character;
    }

    static DEFAULT_OPTIONS = {
        id: "transfer-currency",
        tag: "form",
        classes: ["transfer-currency", "sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            icon: "fas fa-money-bill-transfer",
            title: "MonksEnhancedJournal.TransferCurrency"
        },
        actions: {
            cancel: TransferCurrency.onClose,
            clearCurrency: TransferCurrency.clearCurrency,
            clearAllCurrency: TransferCurrency.clearAllCurrency,
        },
        position: { width: 600 },
        form: {
            handler: TransferCurrency.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/transfer-currency.html"
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
        context.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        context.coins = this.currency;

        context.actor = {
            id: this.actor?.id,
            name: this.actor?.name || "No Actor",
            img: this.actor?.img || "icons/svg/mystery-man.svg"
        };

        return context;
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-hand-holding-usd",
                label: "Transfer",
            },
            {
                type: "button",
                icon: "fas fa-times",
                label: "Cancel",
                action: "cancel"
            },
        ];
    }

    _canDragDrop(selector) {
        return game.user.isGM;
    }

    async _onDrop(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == "Actor") {
            let actor = await fromUuid(data.uuid);

            if (!actor || actor.compendium)
                return;

            this.actor = actor;
            this.render();
        }
    }

    async _onSubmitForm(formConfig, event) {
        event.preventDefault();

        let remainder = this.options.document.getFlag('monks-enhanced-journal', 'currency');

        for (let [k, v] of Object.entries(this.currency)) {
            if (v < 0) {
                // make sure the character has the currency
                let curr = this.loot.getCurrency(this.actor, k);
                if (curr < Math.abs(v)) {
                    ui.notifications.warn("Actor does not have enough currency: " + k);
                    return;
                }
            } else if (v > 0) {
                if (remainder[k] < v) {
                    ui.notifications.warn("Loot does not have enough currency: " + k);
                    return;
                }
            }
        }

        return super._onSubmitForm(formConfig, event);
    }

    static async onSubmitForm(event, form, formData) {
        let remainder = this.options.document.getFlag('monks-enhanced-journal', 'currency') || {};

        for (let [k, v] of Object.entries(this.currency)) {
            if (v != 0) {
                await this.loot.addCurrency(this.actor, k, v);
                remainder[k] = (remainder[k] ?? 0) - v;
            }
        }
        if (game.user.isGM || this.document.isOwner) {
            await this.options.document.setFlag('monks-enhanced-journal', 'currency', remainder);
        } else {
            // Send this to the GM to update the loot sheet currency
            MonksEnhancedJournal.emit("transferCurrency", { currency: remainder, uuid: this.options.document.uuid });
        }
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        $('.actor-icon', this.element).on("dblclick", this.openActor.bind(this));
        $('.currency-field', this.element).on("blur", this.onCurrencyChange.bind(this));

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".transfer-container",
            permissions: {
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                drop: this._onDrop.bind(this),
            }
        }).bind(this.element);
    }

    onCurrencyChange(event) {
        let currName = $(event.currentTarget).attr("name");
        let lootCurrency = this.loot.document.getFlag("monks-enhanced-journal", "currency") || {};
        let maxCurr = lootCurrency[currName] || 0;
        this.currency[currName] = Math.min(parseInt($(event.currentTarget).val() || 0), maxCurr);
        $(event.currentTarget).val(this.currency[currName]);
    }

    static clearCurrency(event, target) {
        const id = target.closest(".item").dataset.id;

        this.currency[id] = 0;
        $(`.currency-field[name="${id}"]`, this.element).val('');
    }

    static clearAllCurrency(event, target) {
        this.currency = {};
        $(`.currency-field`, this.element).val('');
    }

    async openActor() {
        try {
            if (this.actor) {
                this.actor.sheet.render(true);
            }
        } catch { }
    }

    static onClose(event, form) {
        this.close();
    }
}