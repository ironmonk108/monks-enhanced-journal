import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class DistributeCurrency extends HandlebarsApplicationMixin(ApplicationV2) {
    original = {};
    characters = [];
    currency = {};
    totals = {};

    constructor(options = {}) {
        super(options);

        this.loot = options.loot;
        this.currency = options.currency;
        this.original = foundry.utils.duplicate(this.currency);
        this.totals = foundry.utils.duplicate(this.currency);
        let playercurrency = foundry.utils.duplicate(this.currency);
        for (let curr of Object.keys(this.currency))
            playercurrency[curr] = 0;
        this.characters = options.characters.map(c => {
            return {
                id: c.id,
                name: c.name,
                img: c.img,
                currency: foundry.utils.duplicate(playercurrency)
            }
        });

        this.currencies = MonksEnhancedJournal.currencies;

        if (setting("loot-auto-distribute"))
            this.constructor.splitCurrency.call(this);

    }

    static DEFAULT_OPTIONS = {
        id: "distribute-currency",
        tag: "form",
        classes: ["distribute-currency", "sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.DistributeCurrency"
        },
        actions: {
            split: DistributeCurrency.splitCurrency,
            clear: DistributeCurrency.resetData,
            assign: DistributeCurrency.assignCurrency,
        },
        position: { width: 600 },
        form: {
            handler: DistributeCurrency.onSubmitForm,
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/distribute-currency.html"
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
            characters: this.characters,
            currencies: this.currencies,
            currency: this.currency,
            totals: this.totals
        });
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "MonksEnhancedJournal.Distribute",
            }
        ];
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        $('input.player-amount', this.element).change(this.updateAmount.bind(this));
        $('input.currency-amount', this.element).change(this.updateAmount.bind(this));
    }

    calcTotal(currencies) {
        if (currencies == undefined)
            currencies = Object.keys(this.currency);
        else
            currencies = [currencies];
        for (let curr of currencies) {
            this.totals[curr] = this.currency[curr];
            for (let character of this.characters) {
                if (character.currency[curr] !== "")
                    this.totals[curr] = this.totals[curr] + character.currency[curr];
            }
        }
    }

    static resetData() {
        this.currency = foundry.utils.duplicate(this.original);
        for (let character of this.characters) {
            for (let curr of Object.keys(character.currency)) {
                character.currency[curr] = 0;
            }
        }

        this.calcTotal();

        this.render(true);
    }

    updateAmount(event) {
        let curr = event.currentTarget.dataset.currency;
        let charId = event.currentTarget.dataset.character;

        if (charId == undefined)
            this.currency[curr] = parseInt($(event.currentTarget).val() || 0);
        else {
            let character = this.characters.find(c => c.id == charId);
            let value = $(event.currentTarget).val();
            if (value === "")
                character.currency[curr] = "";
            else
                character.currency[curr] = parseInt(value);
        }

        this.calcTotal();

        this.render(true);
    }

    static splitCurrency(event, target) {
        for (let curr of Object.keys(this.currency)) {
            if (this.currency[curr] == 0)
                continue;
            let characters = this.characters.filter(c => {
                return c.currency[curr] !== "";
            });
            if (characters.length == 0)
                continue;
            let part = Math.floor(this.currency[curr] / characters.length);
            for (let character of characters) {
                character.currency[curr] = character.currency[curr] + part;
            }

            this.currency[curr] = this.currency[curr] - (part * characters.length);
            if (setting("distribute-conversion") && this.currency[curr] > 0) {
                //find the next lower currency
                let idx = this.currencies.findIndex(c => c.id == curr);
                let newIdx = idx + 1;
                if (newIdx < this.currencies.length && this.currencies[newIdx].convert != undefined) {
                    //convert to default
                    let convVal = this.currency[curr] * (this.currencies[idx].convert || 1);
                    convVal = convVal / (this.currencies[newIdx].convert || 1);
                    this.currency[curr] = 0;
                    this.currency[this.currencies[newIdx].id] = this.currency[this.currencies[newIdx].id] + convVal;
                }
            }
        }

        this.calcTotal();

        this.render(true);
    }

    static assignCurrency(event, target) {
        let charId = target.dataset.character;

        let character = this.characters.find(c => c.id == charId);
        for (let curr of Object.keys(this.totals)) {
            character.currency[curr] = (character.currency[curr] || 0) + this.currency[curr];
            this.currency[curr] = 0;
        }

        this.calcTotal();

        this.render(true);
    }

    static async onSubmitForm(event, form, formData) {
        this.loot.doSplitMoney(this.characters, this.currency);
    }
}