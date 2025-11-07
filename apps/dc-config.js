import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class DCConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.document = foundry.utils.mergeObject({
            dc: 10,
            attribute: "ability:str"
        }, options.document || {});
    }

    static DEFAULT_OPTIONS = {
        id: "dc-config",
        tag: "form",
        classes: ["dc-sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.DCConfiguration"
        },
        actions: {
            cancel: DCConfig.onClose
        },
        position: { width: 400 },
        form: {
            handler: DCConfig.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/dc-config.html"
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
            name: this.document.name,
            img: this.document.img,
            dc: this.document.dc,
            attribute: this.document.attribute,
            attributeOptions: DCConfig.optionList()
        });
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "MonksEnhancedJournal.Update",
            },
        ];
    }

    static optionList() {
        let config = CONFIG[game.system.id.toUpperCase()] || {};
        if (game.system.id == "tormenta20")
            config = CONFIG.T20;
        else if (game.system.id == "shadowrun5e")
            config = CONFIG.SR5;

        const { lore, ...skills } = config.skillList || {};

        let attributeOptions = [
            { id: "ability", text: "MonksEnhancedJournal.Ability", groups: config.abilities || config.scores || config.atributos },
            { id: "save", text: "MonksEnhancedJournal.SavingThrow", groups: config.savingThrows || config.saves || config.saves_long || config.resistencias || config.abilities },
            { id: "skill", text: "MonksEnhancedJournal.Skill", groups: config.skills || config.pericias || skills }
        ];
        if (game.system.id == "pf2e")
            attributeOptions.push({ id: "attribute", text: i18n("MonksEnhancedJournal.Attribute"), groups: { perception: i18n("PF2E.PerceptionLabel") } });

        attributeOptions = attributeOptions.filter(g => g.groups);
        for (let attr of attributeOptions) {
            attr.groups = foundry.utils.duplicate(attr.groups);
            for (let [k, v] of Object.entries(attr.groups)) {
                attr.groups[k] = v?.label || v;
            }
        }

        return attributeOptions;
    }

    static async onSubmitForm(event, form, formData) {
        let fd = foundry.utils.expandObject(formData.object);

        foundry.utils.mergeObject(this.document, fd);
        if (this.document.id == undefined) {
            this.document.id = makeid();
        }

        let dcs = foundry.utils.duplicate(this.options.journalentry.document.flags["monks-enhanced-journal"].dcs || {});
        dcs[this.document.id] = this.document;

        this.options.journalentry.document.setFlag('monks-enhanced-journal', 'dcs', dcs);
    }

    async close(options) {
        if (this.document.id && (this.document.attribute == 'undefined' || this.document.attribute.indexOf(':') < 0)) {
            this.options.journalentry.deleteItem(this.document.id, 'dcs');    //delete it if it wasn't created properly
        }
        return super.close(options);
    }

    static onClose(event, form) {
        this.close();
    }
}