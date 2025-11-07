import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ObjectiveDisplay extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "objective-display",
        tag: "div",
        classes: ["faded-ui"],
        sheetConfig: false,
        window: {
            title: "MonksEnhancedJournal.Quests",
            resizable: true,
        },
        actions: {
            openQuest: ObjectiveDisplay.openQuest
        },
        position: { width: 600 },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/objective-display.html"
        }
    };

    nonDismissible = true;

    persistPosition = foundry.utils.debounce(this.onPersistPosition.bind(this), 1000);

    onPersistPosition(position) {
        game.user.setFlag("monks-enhanced-journal", "objectivePos", { left: position.left, top: position.top });
    }

    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);

        let pos = game.user.getFlag("monks-enhanced-journal", "objectivePos");
        options.position = {
            width: pos?.width || 500,
            height: pos?.height || 300,
            top: pos?.top || 75,
            left: pos?.left || 120,
        }

        return options;
    }

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "main":
                this._prepareBodyContext(context, options);
                break;
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        let icons = {
            inactive: "fa-ban",
            available: "fa-file-circle-plus",
            inprogress: "fa-circle-exclamation",
            completed: "fa-check",
            failed: "fa-xmark"
        }
        let quests = game.journal.filter(j => {
            if (j.pages.size != 1)
                return false;
            let page = j.pages.contents[0];
            return foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.type') == 'quest' &&
                j.testUserPermission(game.user, "OBSERVER") &&
                page.getFlag('monks-enhanced-journal', 'display');
        }).map(q => {
            let page = q.pages.contents[0];
            let status = foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.status') || (foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.completed') ? 'completed' : 'inactive');
            let data = {
                id: page.id,
                uuid: page.uuid,
                completed: page.getFlag('monks-enhanced-journal', 'completed'),
                status: foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.status') || (foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.completed') ? 'completed' : 'inactive'),
                name: page.name,
                icon: icons[status]
            };

            if (setting('use-objectives')) {
                data.objectives = Object.values(page.getFlag('monks-enhanced-journal', 'objectives') || {})
                    .filter(o => o.available)
                    .map(o => {
                        return {
                            content: o.title || o.content,
                            done: o.done || 0,
                            required: o.required,
                            completed: o.status
                        }
                    });
            }

            return data;
        }).sort((a, b) => {
            let indexA = Object.keys(icons).findIndex(i => i == a.status);
            let indexB = Object.keys(icons).findIndex(i => i == b.status);

            return indexA - indexB;
        });

        return foundry.utils.mergeObject(context, {
            quests
        });
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        $('h1', this.element).addClass('flexrow')
        delete ui.windows[this.appId];
    }

    getPos() {
        this.pos = game.user.getFlag("monks-enhanced-journal", "objectivePos");

        if (this.pos == undefined) {
            this.pos = {
                width: 500,
                height: 300,
                top: 75,
                left: 120,
            };
            game.user.setFlag("monks-enhanced-journal", "objectivePos", this.pos);
        }

        let result = '';
        if (this.pos != undefined) {
            result = Object.entries(this.pos).filter(k => {
                return k[1] != null;
            }).map(k => {
                return k[0] + ":" + k[1] + 'px';
            }).join('; ');
        }

        return result;
    }

    setPosition(position) {
        position = super.setPosition(position);
        this.persistPosition(position);
        return position;
    }

    static async openQuest(event, target) {
        let id = target.dataset.documentId;
        let page = await fromUuid(id);
        MonksEnhancedJournal.openJournalEntry(page);
    }

    async close(options) {
        if (options?.properClose) {
            super.close(options);
            MonksEnhancedJournal.objdisp;
        }
    }
}