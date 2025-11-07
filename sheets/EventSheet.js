import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class EventSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.event",
            icon: "fa-solid fa-calendar-days",
        },
        actions: {

        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/event.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-detailed-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-relationships.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-notes.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".editor-display",
                ".editor-content",
                ".items-list .item-list"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "relationships", icon: "fa-solid fa-users" },
                { id: "notes", icon: "fa-solid fa-paperclip" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    static get type() {
        return 'event';
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        context.relationships = await this.getRelationships();

        context.has = {
            relationships: Object.keys(context.relationships || {})?.length > 0
        }

        context.fields = [
            { id: 'location', label: "MonksEnhancedJournal.Location", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.location") },
            { id: 'date', label: "MonksEnhancedJournal.Date", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.date") }
        ]
        context.placeholder = "MonksEnhancedJournal.Event";

        return context;
    }

    _documentControls() {
        let ctrls = [
            { label: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', label: i18n("MonksEnhancedJournal.SearchDescription"), visible: !!this.enhancedjournal, callback: this.searchText },
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'edit', label: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fas fa-pencil-alt', visible: this.isEditable, action: "editDescription" },
            { id: 'sound', label: i18n("MonksEnhancedJournal.AddSound"), icon: 'fas fa-music', visible: this.isEditable, action: "addSound" },
            { id: 'convert', label: i18n("MonksEnhancedJournal.Convert"), icon: 'fas fa-clipboard-list', visible: (game.user.isGM && this.isEditable), action: "convertSheet" }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.document.isOwner;
    }
}
