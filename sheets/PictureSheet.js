import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class PictureSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.picture",
            icon: "fa-solid fa-image",
        },
        actions: {
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/picture.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-image.hbs",
            ]
        }
    };

    static get type() {
        return 'picture';
    }

    _documentControls() {
        let ctrls = [
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'sound', label: i18n("MonksEnhancedJournal.AddSound"), icon: 'fas fa-music', visible: this.isEditable, action: "addSound" },
            { id: 'convert', label: i18n("MonksEnhancedJournal.Convert"), icon: 'fas fa-clipboard-list', visible: (game.user.isGM && this.isEditable), action: "convertSheet" }
        ];
        return ctrls.concat(super._documentControls());
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        context.placeholder = "MonksEnhancedJournal.Picture";

        return foundry.utils.mergeObject(context, {
            placeholder: i18n("MonksEnhancedJournal.PictureName"),
        });
    }

    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = super._prepareSubmitData(event, form, formData, updateData);
        submitData.src = $('.picture-img', this.trueElement).attr('src');

        return submitData;
    }
}
