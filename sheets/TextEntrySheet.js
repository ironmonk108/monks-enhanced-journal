import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class TextEntrySheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.journalentry",
        },
        actions: {

        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/textentry.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
            ],
            scrollable: [".editor-display"]
        }
    };

    static get type() {
        return 'text';
    }

    _documentControls() {
        let ctrls = [
            { label: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', label: i18n("MonksEnhancedJournal.SearchDescription"), visible: !!this.enhancedjournal, callback: this.searchText },
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'edit', label: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fas fa-pencil-alt', visible: this.isEditable, action: "editDescription" },
            { id: 'sound', label: i18n("MonksEnhancedJournal.AddSound"), icon: 'fas fa-music', visible: this.isEditable, action: "addSound" },
            { id: 'convert', label: i18n("MonksEnhancedJournal.Convert"), icon: 'fas fa-clipboard-list', visible: (game.user.isGM && this.isEditable), action: "convertSheet" },
            { id: 'split', label: i18n("MonksEnhancedJournal.Extract"), icon: 'fas fa-file-export', visible: (game.user.isGM && this.isEditable), action: "splitJournal" }
        ];

        return ctrls.concat(super._documentControls());
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        context.placeholder = "MonksEnhancedJournal.JournalEntryName";

        return foundry.utils.mergeObject(context, {
            placeholder: i18n("MonksEnhancedJournal.JournalName"),
        });
    }
}

export class TextImageEntrySheet extends TextEntrySheet {

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/textimageentry.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-image.hbs",
                "templates/generic/tab-navigation.hbs",
                ...super.PARTS.main.templates
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "picture", icon: "fa-solid fa-image" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    _prepareTabs(group) {
        let tabs = super._prepareTabs(group);

        if (!game.user.isGM) {
            let removedPicture = false;
            if (this.document.src == undefined || this.document.src == '') {
                delete tabs.picture;
                removedPicture = true;
                tabs.description.active = true;
            }
            if (this.document.text.content == '' && !removedPicture) {
                delete tabs.description;
                tabs.picture.active = true;
            }
        }

        return tabs;
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        let hideTabs = (!context.owner && ((this.document.src != undefined && this.document.src != '' && this.document.text.content == '') || ((this.document.src == undefined || this.document.src == '') && this.document.text.content != '')));

        if (game.modules.get('monks-common-display')?.active) {
            let playerdata = game.settings.get("monks-common-display", 'playerdata');
            let pd = playerdata[game.user.id] || { display: false, mirror: false, selection: false };

            if (pd.display)
                hideTabs = true;
        }

        return foundry.utils.mergeObject(context, {
            hideTabs
        });
    }

    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = super._prepareSubmitData(event, form, formData, updateData);
        submitData.src = $('.picture-img', this.trueElement).attr('src');

        return submitData;
    }
}