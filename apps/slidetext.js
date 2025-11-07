import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class SlideText extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(object, config, options = {}) {
        super(object, options);
        this.config = config;
        this.tempdata = foundry.utils.duplicate(object);
    }

    static DEFAULT_OPTIONS = {
        id: "slide-text",
        tag: "form",
        classes: ["slide-sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.SlideText"
        },
        actions: {
            cancel: SlideText.onClose
        },
        position: { width: 500 },
        form: {
            handler: SlideText.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/sheets/slidetext.html",
            templates: [
                "templates/generic/tab-navigation.hbs",
            ],
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "text", icon: "fa-solid fa-signature" },
                { id: "position", icon: "fa-solid fa-up-down-left-right" },
                { id: "appearance", icon: "fa-solid fa-cloud-sun" },
                { id: "transition", icon: "fa-solid fa-running" },
            ],
            initial: "text",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "form":
                this._prepareBodyContext(context, options);
                context.subtabs = this._prepareTabs("primary");
                break;
            case "footer":
                context.buttons = this.prepareButtons();
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        let windowSize = 25;
        let fontOptions = foundry.utils.mergeObject({ "": "" }, MonksEnhancedJournal.fonts);

        let journalFont = foundry.utils.getProperty(this.options.journalentry, "flags.monks-enhanced-journal.font") || {};
        let slideFont = foundry.utils.getProperty(this.options.slideconfig.document, "font") || {};

        return foundry.utils.mergeObject(context, {
            document: this.options.document,
            alignOptions: { left: "MonksEnhancedJournal.Left", center: "MonksEnhancedJournal.Center", right: "MonksEnhancedJournal.Right" },
            fontOptions,
            fontPlaceholder: slideFont.size || journalFont.windowSize || windowSize,
            colorPlaceholder: slideFont.color || journalFont.color || "#FFFFFF"
        });
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "MonksEnhancedJournal.Save",
            },
            {
                type: "button",
                icon: "fas fa-ban",
                label: "MonksEnhancedJournal.Cancel",
                action: "cancel"
            },
        ];
    }

    /*
    async _onChangeInput(event) {
        const formData = foundry.utils.expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        foundry.utils.mergeObject(this.tempdata, formData);
        this.config.refreshText(this.tempdata);
    }
    */

    static onSubmitForm(event, form, formData) {
        let submitData = foundry.utils.expandObject(formData.object);
        this.options.slideconfig.updateText(this.options.document.id, submitData);
    }

    static onClose(event, form) {
        this.options.slideconfig.refreshText(this.options.document);
        this.close();
    }
}