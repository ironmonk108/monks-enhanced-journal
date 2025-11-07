import { log, setting, i18n, MonksEnhancedJournal } from '../monks-enhanced-journal.js';
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { BasePlaceableHUD } = foundry.applications.hud;

export class NoteHUD extends HandlebarsApplicationMixin(BasePlaceableHUD) {
    static DEFAULT_OPTIONS = {
        id: "note-hud",
        actions: {
            show: NoteHUD.showToPlayers,
            encounter: NoteHUD.startEncounter,
            select: NoteHUD.selectEncounter,
            assign: NoteHUD.assignItems,
            visibility: NoteHUD.onToggleVisibility,
        }
    }

    static PARTS = {
        hud: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/note-hud.html"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        let type = this.page?.type;

        let document = this.entry;

        const visible = document.ownership.default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;

        return foundry.utils.mergeObject(context, {
            visibilityClass: visible ? "" : "active",
            type: type,
        });
    }

    get entry() {
        return this.document.entry;
    }

    get page() {
        let page = this.document.page;
        if (!page) {
            if (this.document.entry.pages.contents.length == 1)
                page = this.document.entry.pages.contents[0];
        }
        MonksEnhancedJournal.fixType(page);
        return page;
    }

    static async onToggleVisibility(event, target) {
        event.preventDefault();

        let document = this.document.page || this.entry;
        if (document instanceof JournalEntryPage) {
            let type = foundry.utils.getProperty(document, "flags.monks-enhanced-journal.type");
            if (type == "base" || type == "oldentry") type = "journalentry";
            let types = MonksEnhancedJournal.getDocumentTypes();
            if (types[type]) {
                document = this.entry;
            }
        }

        let ownership = {};
        Object.assign(ownership, document.ownership);
        let isHidden = ownership["default"] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
        ownership["default"] = (isHidden ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : (document.type == "loot" || document.type == "shop" || !setting("hud-limited") ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED));
        document.update({ ownership: ownership });

        target.classList.toggle("active", isHidden);
    }

    static showToPlayer(event, target) {
    }

    static startEncounter(event, target) {
        if (this.page) {
            const cls = (this.page._getSheetClass ? this.page._getSheetClass() : null);
            if (cls && cls.createEncounter) {
                cls.createEncounter.call(this.page, { x: this.document.x, y: this.document.y, distance: 20, t: "rect", center: true }, { combat: true });
            }
        }
    }

    static selectEncounter(event, target) {
        if (this.page) {
            const cls = (this.page._getSheetClass ? this.page._getSheetClass() : null);
            if (cls && cls.selectEncounter) {
                cls.selectEncounter.call(this.page);
            }
        }
    }

    static assignItems(event, target) {
        if (this.page) {
            const cls = (this.page._getSheetClass ? this.page._getSheetClass() : null);
            if (cls && cls.assignItemsFromDocument) {
                cls.assignItemsFromDocument.call(this.page);
            }
        }
    }

    _updatePosition(position) {
        position = super._updatePosition(position);
        position.left = position.left - (this.document.iconSize / 2);
        position.top = position.top - (this.document.iconSize / 2);
        return position;
    }
}