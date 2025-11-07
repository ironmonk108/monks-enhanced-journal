import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class SlideshowViewer extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "slideshow-viewer",
        tag: "form",
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            resizable: true
        },
        form: {
            closeOnSubmit: false,
            submitOnChange: false,
            submitOnClose: false,
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/sheets/slideshow-viewer.html"
        }
    };

    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);

        options.position = {
            width: ($('body').width() * 0.75),
            height: ($('body').height() * 0.75),
            left: ($('body').width() * 0.125),
            top: ($('body').height() * 0.125),
        }

        return options;
    }

    /*
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "form":
                this._prepareBodyContext(context, options);
                break;
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        return foundry.utils.mergeObject(context, {
        });
    }
    */

    get title() {
        return this.options.document.name;
    }
}