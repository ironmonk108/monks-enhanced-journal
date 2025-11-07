import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class BlankSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.NewTab",
            icon: "fa-solid fa-book-open",
        },
        position: { width: 1025, height: 700 },
        actions: {
            newLink: BlankSheet.onNewLink,
            recentLink: BlankSheet.onRecentLink,
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/blank.html"
        }
    };

    static get type() {
        return 'blank';
    }

    async _prepareBodyContext(context, options) {
        context = foundry.utils.mergeObject(context, {
            title: i18n("MonksEnhancedJournal.NewTab"),
            recent: (game.user.getFlag("monks-enhanced-journal", "_recentlyViewed") || []).map(r => {
                return foundry.utils.mergeObject(r, { img: MonksEnhancedJournal.getIcon(r.type) });
            })
        });
        return context;
    }

    _initializeApplicationOptions(options) {
        options.id = "blank-journal-sheet";
        return options;
    }

    static onNewLink(event, target) {
        const options = { width: 320 };
        const cls = getDocumentClass("JournalEntry");
        return cls.createDialog({}, {}, options);
    }

    static async onRecentLink(event, target) {
        let uuid = target.dataset.documentUuid;
        let id = target.dataset.documentId;
        let document;
        if (uuid)
            document = await fromUuid(uuid);
        else
            document = game.journal.find(j => j.id == id);
        if (document)
            this.enhancedjournal.open(document);
    }

    async activateListeners(html) {
        // Needs to be empty to avoid calling super which adds a bunch of stuff we don't need
    }

    _documentControls() {
        return [];
    }
}
