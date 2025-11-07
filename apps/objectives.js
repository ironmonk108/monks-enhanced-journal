import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class Objectives extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "objectives",
        tag: "form",
        classes: ["objective-sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.Objectives",
            resizable: true
        },
        position: { width: 600 },
        form: {
            handler: Objectives.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/objectives.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
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
                await this._prepareBodyContext(context, options);
                break;
            case "footer":
                context.buttons = this.prepareButtons();
        }

        return context;
    }

    async _prepareBodyContext(context, options) {
        context.document = this.options.document;

        return context;
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

    static async onSubmitForm(event, form, formData) {
        foundry.utils.mergeObject(this.options.document, formData.object);
        let objectives = foundry.utils.duplicate(this.options.journalentry.document.flags["monks-enhanced-journal"].objectives || {});
        if (this.options.document.id == undefined) {
            this.options.document.id = makeid();
        }
        objectives[this.options.document.id] = this.options.document;

        this.options.journalentry.document.setFlag('monks-enhanced-journal', 'objectives', objectives);
    }
}