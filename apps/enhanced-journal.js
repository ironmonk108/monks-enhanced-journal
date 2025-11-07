import { MonksEnhancedJournal, log, i18n, error, setting, getVolume, makeid  } from "../monks-enhanced-journal.js"
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js"
import { BlankSheet } from "../sheets/BlankSheet.js"
import { JournalEntrySheet } from "../sheets/JournalEntrySheet.js"
import { ApplicationSheetConfig } from "./sheet-configure.js";
const { ApplicationV2, DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api


class BlankJournal extends foundry.abstract.Document {
    constructor(options) {
        super(options);
        foundry.utils.mergeObject(this, options);
    }

    static defineSchema() {
        return {
            name: new foundry.data.fields.StringField({ required: false, blank: true }),
            type: new foundry.data.fields.StringField({ required: true, blank: true, initial: "blank" }),
            content: new foundry.data.fields.StringField({ required: false, blank: true }),
            options: new foundry.data.fields.SchemaField({
                hidebuttons: new foundry.data.fields.BooleanField({ initial: true }),
                position: new foundry.data.fields.ObjectField(),
                window: new foundry.data.fields.ObjectField(),
            }),
            flags: new foundry.data.fields.DocumentFlagsField(),
        }
    }

    get id() {
        return "blank-journal-entry";
    }

    get uuid() {
        return "blank-journal-entry";
    }

    get documentName() {
        return "JournalEntryPage";
    }
}
export class EnhancedJournal extends HandlebarsApplicationMixin(ApplicationV2) {
    tabs = [];
    bookmarks = [];
    searchresults = [];
    searchpos = 0;
    lastquery = '';
    _imgcontext = null;
    subsheetState = {};

    constructor(options) {
        super(options);
        this.document = this.options.document;
    }

    static DEFAULT_OPTIONS = {
        id: "MonksEnhancedJournal",
        tag: "form",
        classes: ["monks-enhanced-journal"],
        sheetConfig: true,
        editable: true,
        window: {
            contentClasses: [],
            icon: "fa-solid fa-book-open",
            title: "MonksEnhancedJournal.AppName",
            resizable: true,
            viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
            controls: [{
                icon: "fa-solid fa-gear",
                label: "SHEETS.ConfigureSheet",
                action: "configureSheet",
                visible: true //DocumentSheetV2.#canConfigureSheet
            }]
        },
        actions: {
            showPlayers: EnhancedJournal.doShowPlayers,
            configureSheet: EnhancedJournal.onConfigureSheet,
            addPage: EnhancedJournal.addPage,
            toggleViewMode: EnhancedJournal.toggleViewMode,
            navigatePrevious: EnhancedJournal.navigatePrevious,
            navigateNext: EnhancedJournal.navigateNext,
        },
        position: { width: 1025, height: 700 },
        form: {
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: true,
            //handler: EnhancedJournal.onSubmit
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/main.html",
            templates: ["modules/monks-enhanced-journal/templates/directory.html"],
            scrollable: [".directory-list"]
        }
    };

    get subsheetElement() {
        return $('.content > section', this.element).get(0);
    }

    delay(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    changeTab(tab, group, options = {}) {
        // Reset the tab so that the subsheet can handle it
        this.tabGroups[group] = "";
        super.changeTab(tab, group, options);
        game.user.setFlag("monks-enhanced-journal", `pagestate.${this.document.id}.tabId`, tab);
    }

    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);

        const { colorScheme } = game.settings.get("core", "uiConfig");
        options.classes.push("themed", `theme-${colorScheme.applications || "dark"}`);

        if (game.modules.get("rippers-ui")?.active)
            options.classes.push('rippers-ui');
        if (game.modules.get("rpg-styled-ui")?.active)
            options.classes.push('rpg-styled-ui');
        if (!setting("show-bookmarkbar"))
            options.classes.push('hide-bookmark');

        return options;
    }

    async _preFirstRender(context, options) {
        await super._preFirstRender(context, options);

        this.tabs = foundry.utils.duplicate(game.user.getFlag('monks-enhanced-journal', 'tabs') || [{ "id": makeid(), "text": i18n("MonksEnhancedJournal.NewTab"), "active": true, "history": [] }]);
        this.tabs = this.tabs.map(t => { delete t.entity; return t; })
        this.tabs.active = (findone = true) => {
            let tab = this.tabs.find(t => t.active);
            if (findone) {
                if (tab == undefined && this.tabs.length > 0)
                    tab = this.tabs[0];
            }
            return tab;
        };
        this.bookmarks = foundry.utils.duplicate(game.user.getFlag('monks-enhanced-journal', 'bookmarks') || []);

        this._tabs;// = new Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: null, callback: this.tabChange });

        this._collapsed = setting('start-collapsed');

        //this.subdocument = null;

        this._lastentry = null;
        this._backgroundsound = {};

        //load up the last entry being shown
        if (options.document != undefined)
            this.open(options.document, options?.newtab, { anchor: options?.anchor });

        this._soundHook = Hooks.on(game.modules.get("monks-sound-enhancements")?.active ? "globalSoundEffectVolumeChanged" : "globalInterfaceVolumeChanged", (volume) => {
            for (let sound of Object.values(this._backgroundsound)) {
                sound.volume = volume * getVolume()
            }
        });

    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        
    }

    async _renderFrame(options) {
        const frame = await super._renderFrame(options);
        if (!this.hasFrame) return frame;

        const copyLabel = game.i18n.localize("SHEETS.CopyUuid");
        const copyId = `
    <button type="button" class="header-control fa-solid fa-passport icon" data-action="copyUuid"
            data-tooltip="${copyLabel}" aria-label="${copyLabel}"></button>
    `;
        this.window.close.insertAdjacentHTML("beforebegin", copyId);

        const copyImage = "Copy image path";
        const copyImageId = `
    <button type="button" class="header-control fa-solid fa-file-image icon" data-action="copyImage"
            data-tooltip="${copyImage}" aria-label="${copyImage}"></button>
    `;
        this.window.close.insertAdjacentHTML("beforebegin", copyImageId);

        return frame;
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
        let canBack = this.canBack();
        let canForward = this.canForward();

        const cfg = CONFIG["JournalEntry"];
        const cls = cfg.documentClass;

        context = foundry.utils.mergeObject(context, {
            tree: ui.journal.collection.tree,
            entryPartial: ui.journal.constructor.entryPartial,
            folderPartial: ui.journal.constructor.folderPartial,
            canCreateEntry: cls.canUserCreate(game.user),
            canCreateFolder: ui.journal._canCreateFolder(),
            maxFolderDepth: ui.journal.collection.maxFolderDepth,
            searchMode: this.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME
                ? { icon: "fa-solid fa-magnifying-glass", label: "SIDEBAR.SearchModeName" }
                : { icon: "fa-solid fa-file-magnifying-glass", label: "SIDEBAR.SearchModeFull" },
            sortMode: this.collection.sortingMode === "a"
                ? { icon: "fa-solid fa-arrow-down-a-z", label: "SIDEBAR.SortModeAlpha" }
                : { icon: "fa-solid fa-arrow-down-short-wide", label: "SIDEBAR.SortModeManual" },
            documentCls: cls.documentName.toLowerCase(),
            documentName: ui.journal.collection.documentName,
            tabName: cls.metadata.collection,
            sidebarIcon: cfg.sidebarIcon,
            folderIcon: "fas fa-folder",
            user: game.user,
            label: i18n("MonksEnhancedJournal.Entry"),
            labelPlural: i18n(cls.metadata.labelPlural),
            unavailable: game.user.isGM ? cfg.collection?.instance?.invalidDocumentIds?.size : 0
        });
        const types = game.i18n.localize(cls.metadata.labelPlural);
        context.searchMode.placeholder = game.i18n.format("SIDEBAR.Search", { types });

        context.buttons = [];
        const unavailable = game.user.isGM ? ui.journal.collection.invalidDocumentIds.size : 0;
        if (unavailable) {
            const plurals = new Intl.PluralRules(game.i18n.lang);
            const locPath = `SUPPORT.UnavailableDocuments.${plurals.select(unavailable)}`;
            const docLabel = game.i18n.localize(cls.metadata.label);
            const label = game.i18n.format(locPath, { count: unavailable, document: docLabel });
            context.buttons.push({
                type: "button", cssClass: "plain", icon: "fa-solid fa-triangle-exclamation", label,
                action: "showIssues"
            });
        }

        return foundry.utils.mergeObject(context,
            {
                tabs: this.tabs,
                bookmarks: this.bookmarks.sort((a, b) => a.sort - b.sort),
                user: game.user,
                canForward: canForward,
                canBack: canBack,
                collapsed: this._collapsed,
                contextClasses: [`${game.system.id}`].join(" ")
            }, { recursive: false }
        );
    }

    static onConfigureSheet(event) {
        event.stopPropagation(); // Don't trigger other events
        if (event.detail > 1) return; // Ignore repeated clicks

        new ApplicationSheetConfig({
            type: "enhancedjournal",
            position: {
                top: this.position.top + 40,
                left: this.position.left + ((this.position.width - 500) / 2)
            }
        }).render({ force: true });
    }

    _getHeaderControls() {
        return this.subsheet?._getHeaderControls?.() || [];
    }

    get entryType() {
        return ui.journal.collection.documentName;
    }

    get _onCreateDocument() {
        return ui.journal._onCreateDocument;
    }

    get collection() {
        return ui.journal.collection;
    }

    get isEditable() {
        let document = this.document;
        if (document instanceof JournalEntryPage && !!foundry.utils.getProperty(document, "flags.monks-enhanced-journal.type")) {
            let type = foundry.utils.getProperty(document, "flags.monks-enhanced-journal.type");
            if (type == "base" || type == "oldentry") type = "journalentry";
            let types = MonksEnhancedJournal.getDocumentTypes();
            if (types[type]) {
                document = document.parent;
            }
        }

        let editable = !!this.options["editable"] && document.isOwner;
        if (document.pack) {
            const pack = game.packs.get(document.pack);
            if (pack.locked) editable = false;
        }
        return editable;
    }

    _onClickAction(event, target) {
        event.stopPropagation();
        event.preventDefault();

        const action = target.dataset.action;
        // Get the subsheet's actions
        let handler = this.subsheet.actions[action];

        if (handler){
            handler.call(this.subsheet, event, target);
        }
    }

    _replaceHTML(result, content, options) {
        
        if (this.subsheet && this.subsheet.document?.id && !["blank", "folder"].includes(this.document.type) && !(this.document instanceof Actor))
        {
            let subsheetState = { type: this.subsheet.constructor.type };
            const priorElement = this.subsheetElement;

            if (priorElement) {
                let parts = Object.keys(this.subsheet.constructor.PARTS);
                for (let partId of parts) {
                    let partState = {};
                    this.subsheet._preSyncPartState.call(this.subsheet, partId, priorElement, priorElement, partState);

                    if (partState.focus) {
                        // Get the caret position within the focused element
                        partState.focusCaret = document.activeElement.selectionStart;
                    }
                    subsheetState[partId] = partState;
                }
                this.subsheetState[this.subsheet.document.id] = subsheetState;
            }
        }

        super._replaceHTML(result, content, options);
    }

    async _onRender(context, options) {
        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".journal-tab, .bookmark-button",
            dropSelector: ".enhanced-journal-header",
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(this.element);

        this._createContextMenus(this.element);

        $('.open-gm-note', this.element).remove();
        let result = await super._onRender(context, options);

        if (setting('background-image') != 'none') {
            $(this.element).attr("background-image", setting('background-image'));
        } else {
            $(this.element).removeAttr("background-image");
        }

        if (setting('sidebar-image') != 'none') {
            $(this.element).attr("sidebar-image", setting('sidebar-image'));
        } else {
            $(this.element).removeAttr("sidebar-image");
        }

        if (this.element) {
            MonksEnhancedJournal.updateDirectory(this.element, false);
            this.activateDirectoryListeners(this.element);
            this.renderSubSheet(options);
        }

        let that = this;

        $('.add-bookmark', this.element).click(this.addBookmark.bind(this));
        $('.bookmark-button:not(.add-bookmark)', this.element).click(this.activateBookmark.bind(this));

        $('.tab-add', this.element).click(this.addTab.bind(this));
        $('.journal-tab', this.element).each((idx, elem) => {
            $(elem).click(this.activateTab.bind(that, $(elem).attr('data-tabid')));
        });

        $('.journal-tab .close').each(function () {
            let tabid = $(this).closest('.journal-tab')[0].dataset.tabid;
            let tab = that.tabs.find(t => t.id == tabid);
            $(this).click(that.removeTab.bind(that, tab));
        });

        $('.back-button, .forward-button', this.element).toggle(game.user.isGM || setting('allow-player')).on('click', this.navigateHistory.bind(this));

        return result;
    }

    async renderSubSheet(options = {}) {
        try {
            const modes = foundry.appv1.sheets.JournalSheet.VIEW_MODES;

            let currentTab = this.tabs.active();
            if (!currentTab) {
                if (this.tabs.length)
                    currentTab = this.tabs[0];
                else
                    currentTab = this.addTab();
            }
            if (!currentTab.entity && !["blank", "folder"].includes(foundry.utils.getProperty(currentTab, "flags.monks-enhanced-journal.type")))
                currentTab.entity = await this.findEntity(currentTab.entityId);
            if (this.document?.id != currentTab.entity?.id || currentTab.entity instanceof Promise || currentTab.entity?.id == "blank-journal-entry")
                this.document = currentTab.entity;

            //if there's no object then show the default
            if (this.document instanceof Promise)
                this.document = await this.document;


            if (this.document instanceof JournalEntry && this.document.pages.size == 1 && (!!foundry.utils.getProperty(this.document.pages.contents[0], "flags.monks-enhanced-journal.type") || !!foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.type"))) {
                let type = foundry.utils.getProperty(this.document.pages.contents[0], "flags.monks-enhanced-journal.type") || foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.type");
                if (type == "base" || type == "oldentry") type = "journalentry";
                let types = MonksEnhancedJournal.getDocumentTypes();
                if (types[type]) {
                    this.document = this.document.pages.contents[0];
                    let tab = this.tabs.active();
                    tab.entityId = this.document.uuid;
                    tab.entity = this.document;
                    this.saveTabs();
                }
            }

            if (!["blank", "folder"].includes(this.document.type))
                MonksEnhancedJournal.fixType(this.document);

            let force = options.force || this.tempOwnership;

            if (force != true) {
                let testing = this.document;
                if (testing instanceof JournalEntryPage && !!foundry.utils.getProperty(testing, "flags.monks-enhanced-journal.type"))
                    testing = testing.parent;

                if (!game.user.isGM && testing && ((!testing.compendium && testing.testUserPermission && !testing.testUserPermission(game.user, "OBSERVER")) || (testing.compendium && !testing.compendium.visible))) {
                    this.document = new BlankJournal({
                        name: this.document.name,
                        type: 'blank',
                        options: {
                            hidebuttons: true,
                        },
                        flags: {
                            'monks-enhanced-journal': { type: 'blank' }
                        },
                        content: `${i18n("MonksEnhancedJournal.DoNotHavePermission")}: ${this.document.name}`
                    });
                }
            } else if (!["blank", "folder"].includes(this.document.type) && this.document.testUserPermission) {
                if (!this.document.testUserPermission(game.user, "OBSERVER") || (this.document.parent && !this.document.parent.testUserPermission(game.user, "OBSERVER"))) {
                    this.document.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                    if (this.document.parent)
                        this.document.parent.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                    this.tempOwnership = true;
                }
            }

            let subsheetElement = this.subsheetElement;

            let subsheetOptions = {
                expanded: !setting("start-toc-collapsed"),
                pageIndex: options.pageIndex,
                pageId: options.pageId,
                anchor: options.anchor,
                tempOwnership: options.tempOwnership
            };
            if (this.subsheet?.document?.id != this.document?.id || this.subsheet?.type != this.document?.type) {
                // The subsheet has changed, so we need to re-render it
                const cls = this.document instanceof JournalEntry ? JournalEntrySheet : (this.document._getSheetClass ? this.document._getSheetClass() : null);
                if (!cls || this.document instanceof Actor) {
                    if (this.document instanceof Actor)
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotOpenActorInEnhancedJournal"));
                    this.subsheet = new BlankSheet({ document: this.document, enhancedjournal: this, tabs: this.tabs, position: { width: 1024, height: 768 }, window: {}, ...this.document.options });
                } else {
                    subsheetOptions = foundry.utils.mergeObject(subsheetOptions, game.user.getFlag("monks-enhanced-journal", `pagestate.${this.document.id}`) || {});

                    this.subsheet = new cls({ document: this.document, editable: this.document.isOwner, enhancedjournal: this, ...subsheetOptions });
                }
                this.document._sheet = this.subsheet;

                $(subsheetElement).empty();
            }

            let subsheet = this.subsheet;

            let tabId = game.user.getFlag("monks-enhanced-journal", `pagestate.${this.document.id}.tabId`);
            if (tabId)
                subsheet.tabGroups = { primary: tabId };

            subsheet._state = subsheet.constructor.RENDER_STATES.RENDERING;

            this.activateFooterListeners(this.element);

            $('> header a.subsheet', this.element).remove();
            if (subsheet._getHeaderButtons && this.document.id && !(this.document instanceof JournalEntry)) {
                let buttons = subsheet._getHeaderButtons();
                buttons.findSplice(b => b.class == "share-image");
                Hooks.call(`getDocumentSheetHeaderButtons`, subsheet, buttons);

                let first = true;
                let a;
                for (let btn of buttons) {
                    if ($('> header a.' + btn.class, this.element).length == 0) {   //don't repeat buttons
                        a = $('<a>').addClass(btn.class).addClass('subsheet').toggleClass('first', first)
                            .append($('<i>').addClass(btn.icon))
                            .append(i18n(btn.label))
                            .click(event => {
                                event.preventDefault();
                                btn.onclick.call(subsheet, event);
                            }).insertBefore($('> header a.close', this.element));
                        first = false;
                    }
                }
                if (a)
                    a.addClass('last');
            }

            subsheet.enhancedjournal = this;

            subsheet._configureRenderOptions.call(subsheet, subsheetOptions);
            let subsheetContext = await subsheet._prepareContext.call(subsheet, subsheetOptions);

            await subsheet._preRender.call(subsheet, subsheetContext, subsheetOptions);

            //if (subsheetOptions.parts.length > 1)
            //    debugger;

            // If there are any Handlebar.promises related to monks-enhanced-journal, then set a timer and wait for it to finish
            let count = 0;
            while (Object.keys(Handlebars.promises).length > 0 && count < 10) {
                await this.delay(100);
                count++;
            }

            let result = await subsheet._renderHTML.call(subsheet, subsheetContext, subsheetOptions);

            $('.window-title', this.element).html((subsheet.title || i18n("MonksEnhancedJournal.NewTab")) + ' - ' + i18n("MonksEnhancedJournal.AppName"));

            if (subsheet._createDocumentIdLink)
                subsheet._createDocumentIdLink(subsheetElement)

            $('.content', this.element).attr('entity-type', this.document.type).attr('entity-id', this.document.id).attr('entity-uuid', this.document.uuid);
            //extract special classes
            /*
            if (setting("extract-extra-classes")) {
                let extraClasses = subsheet.options.classes.filter(x => !["sheet", "journal-sheet", "journal-entry", "monks-journal-sheet"].includes(x) && !!x);
                if (extraClasses.length) {
                    this.element.addClass(extraClasses);
                }
            }
            */
            let classes = subsheet.classes?.join(' ') || '';
            if (game.system.id == "pf2e")
                classes += " journal-page-content";
            if (!(subsheet instanceof foundry.appv1.sheets.ActorSheet)) {
                if (setting("use-system-tag"))
                    classes += " " + game.system.id;
            }

            if (this.document instanceof JournalEntry) {
                classes += (subsheet?.mode === modes.MULTIPLE ? " multiple-pages" : " single-page");
            }

            //contentform.empty().attr('class', classes)//.append(this.subdocument); //.concat([`${game.system.id}`]).join(' ')
            $(subsheetElement).attr('class', classes);
            subsheet._replaceHTML.call(subsheet, result, subsheetElement, subsheetOptions);

            if (!this.isEditable) {
                let originalFramed = subsheet.options.window.frame;
                subsheet.options.window.frame = false;
                subsheet._toggleDisabled.call(subsheet, true);
                subsheet.options.window.frame = originalFramed;
            }

            if (subsheet.refresh)
                subsheet.refresh();

            if (subsheet.activateListeners)
                subsheet.activateListeners.call(subsheet, subsheetElement);
            if (subsheet.subRender)
                await subsheet.subRender.call(subsheet, subsheetContext, subsheetOptions);

            // Manually restore the state of the subsheet
            if (subsheet && subsheet.document?.id && this.subsheetState[subsheet.document.id]) {
                let parts = subsheet.constructor.PARTS;
                let state = this.subsheetState[subsheet.document.id];
                if (state.type == subsheet.constructor.type) {
                    for (let [partId, part] of Object.entries(parts)) {
                        let partState = state[partId] || {};

                        if (partState.scrollPositions?.length) {
                            // Replace the elements with the new ones so the scroll positions are applied to the correct elements
                            let scrollableSelectors = (part.scrollable || []);
                            let idx = 0;
                            for (let i = 0; i < scrollableSelectors.length; i++) {
                                const selector = scrollableSelectors[i];
                                const el1 = selector === "" ? subsheetElement : subsheetElement.querySelector(selector);
                                if (!el1) continue;
                                if (partState.scrollPositions[idx]?.length > 0)
                                    partState.scrollPositions[idx][0] = el1;
                                idx++;
                            }
                        }

                        subsheet._syncPartState.call(subsheet, partId, subsheetElement, subsheetElement, partState);
                        if (partState.focus && !!partState.focusCaret) {
                            // Restore the focus caret position within the focused element
                            document.activeElement.selectionStart = partState.focusCaret;
                        }
                    }
                }
            }

            if (subsheet.constructor.onSubmit)
                $('button[type="submit"]', subsheetElement).attr('type', 'button').on("click", subsheet.constructor.onSubmit.bind(subsheet));
            $('form.journal-header', subsheetElement).on("submit", () => { return false; });

            if (!["blank", "folder"].includes(this.document.type))
                subsheet.constructor.updateStyle.call(subsheet, null, subsheetElement);

            if (game.modules.get("polyglot")?.active && subsheet.renderPolyglot)
                subsheet.renderPolyglot(subsheetElement);

            this.document._sheet = null;  // Adding this to prevent Quick Encounters from automatically opening

            if (!["blank", "folder"].includes(this.document.type)) {
                //Hooks.callAll('renderJournalSheet', { document: subsheet.parent }, subsheetElement, subsheetContext); //this.document);
                if (this.document._source.type == "text")
                    Hooks.callAll('renderJournalTextPageSheet', subsheet, subsheetElement, subsheetContext);
                if (subsheet.document instanceof JournalEntryPage)
                    Hooks.callAll('renderJournalPageSheet', subsheet, subsheetElement, Object.assign({ enhancedjournal: this }, subsheetContext));
            }

            this.document._sheet = subsheet;

            //if this entry is different from the last one...
            if (this._lastentry != this.document.id) {
                // end a sound file if it's playing
                for(let [key, sound] of Object.entries(this._backgroundsound)) {
                    sound.fade(0, { duration: 250 }).then(() => {
                        sound?.stop();
                        delete this._backgroundsound[key];
                    });
                }
                // if the new entry has a sound file, that autoplays, then start the sound file playing
                if (!["blank", "folder"].includes(this.document.type)) {
                    let sound = this.document.getFlag("monks-enhanced-journal", "sound");
                    if (sound?.audiofile && sound?.autoplay && subsheet?.canPlaySound) {
                        subsheet._playSound(sound).then((soundfile) => {
                            this._backgroundsound[this.document.id] = soundfile;
                        });
                    }
                }
            }
            
            this._lastentry = this.document.id;

            this.activateControls($('#left-journal-buttons', this.element).empty(), $('#right-journal-buttons', this.element).empty());

            let controls = [];
            for (const c of subsheet._getHeaderControls()) {
                const visible = typeof c.visible === "function" ? c.visible.call(this) : c.visible ?? true;
                if (visible) controls.push(this._renderHeaderControl(c));
            }
            this.window.controlsDropdown.replaceChildren(...controls);
            this.window.controls.classList.toggle("hidden", !controls.length);

            this.document._sheet = null; //set this to null so that other things can open the sheet
            subsheet._state = subsheet.constructor.RENDER_STATES.RENDERED;
            
        } catch(err) {
            // display an error rendering the subsheet
            error(err);
        }
    }

    _onChangeForm(formConfig, event) {
        if (event.target instanceof foundry.applications.elements.HTMLSecretBlockElement) return this.subsheet._onRevealSecret(event);
        super._onChangeForm(formConfig, event);
    }

    _saveScrollPositions(html) {
        super._saveScrollPositions(html);
        if (this.subsheet && this.subsheet.rendered && this.subsheet.options.scrollY && this.subsheet.object.id == this.document.id) {   //only save if we're refreshing the sheet
            const selectors = this.subsheet.options.scrollY || [];

            this._scrollPositions = selectors.reduce((pos, sel) => {
                //const el = $(sel, this.subsheetElement);
                //if (el.length === 1) pos[sel] = Array.from(el).map(el => el[0].scrollTop);
                const el = $(this.subsheetElement).find(sel);
                pos[sel] = Array.from(el).map(el => el.scrollTop);
                return pos;
            }, (this._scrollPositions || {}));

            game.user.setFlag("monks-enhanced-journal", `pagestate.${this.document.id}.scrollPositions`, foundry.utils.flattenObject(this._scrollPositions));
        }
    }

    saveScrollPos() {
        if (this?.subsheet && this.subsheet.options.scrollY && this.subsheet.object.id == this.document.id) {   //only save if we're refreshing the sheet
            const selectors = this.subsheet.options.scrollY || [];

            let newScrollPositions = selectors.reduce((pos, sel) => {
                const el = $(this.subsheetElement).find(sel);
                pos[sel] = Array.from(el).map(el => el.scrollTop);
                return pos;
            }, {});

            let oldScrollPosition = foundry.utils.flattenObject(game.user.getFlag("monks-enhanced-journal", `pagestate.${this.document.id}.scrollPositions`) || {});

            game.user.setFlag("monks-enhanced-journal", `pagestate.${this.document.id}.scrollPositions`, foundry.utils.flattenObject(foundry.utils.mergeObject(oldScrollPosition, newScrollPositions)));
        }
    }

    saveEditor(name) {
        $('.nav-button.edit i', this.element).addClass('fa-pencil-alt').removeClass('fa-save').attr('data-tooltip', i18n("MonksEnhancedJournal.EditDescription"));
        $('.nav-button.split', this.element).removeClass('disabled');
        const editor = this.subsheet.editors[name];
        if (editor)
            editor.button.style.display = "";

        const owner = this.document.isOwner;
        (game.system.id == "pf2e" ? game.pf2e.TextEditor : foundry.applications.ux.TextEditor.implementation).enrichHTML(this.document.content, { secrets: owner, documents: true, async: true }).then((content) => {
            $(`.editor-display[data-edit="${name}"]`, this.element).html(content);
        });
        
    }

    activateControls(left, right) {
        let ctrls = [];
        if (this.subsheet._documentControls)
            ctrls = this.subsheet._documentControls();
        else if (this.document instanceof JournalEntry) {
            ctrls = this.journalEntryDocumentControls();
         }

        let that = this;

        Hooks.callAll('activateControls', this, ctrls);
        if (ctrls) {
            for (let ctrl of ctrls) {
                if (ctrl.visible != undefined) {
                    if (typeof ctrl.visible == 'function') {
                        if (!ctrl.visible.call(this.subsheet, this.subsheet.object))
                            continue;
                    }
                    else if (!ctrl.visible)
                        continue;
                }
                let div = '';
                switch (ctrl.type || 'button') {
                    case 'button':
                        div = $('<div>')
                            .addClass('nav-button ' + ctrl.id)
                            .attr('data-tooltip', ctrl.label)
                            .attr('data-action', ctrl.action)
                            .append($('<i>').addClass(ctrl.icon));
                        if (ctrl.callback)
                            div.on('click', ctrl.callback.bind(this.subsheet));
                        break;
                    case 'input':
                        div = $('<input>')
                            .addClass('nav-input ' + ctrl.id)
                            .attr(foundry.utils.mergeObject({ 'type': 'text', 'autocomplete': 'off', 'placeholder': ctrl.label }, (ctrl.attributes || {})))
                            .on('keyup', function (event) {
                                if (ctrl.callback)
                                    ctrl.callback.call(that.subsheet, this.value, event);
                            });
                        break;
                    case 'text':
                        div = $('<div>').addClass('nav-text ' + ctrl.id).html(ctrl.label);
                        break;
                }

                if (ctrl.attr) {
                    div.attr(ctrl.attr);
                }

                if (div != '') {
                    if (ctrl.visible === false)
                        div.hide();
                    if (ctrl.leftAlign === true)
                        left.append(div);
                    else
                        right.append(div);
                }
            }
        }
    }

    get getDocumentTypes() {
        return foundry.utils.mergeObject(MonksEnhancedJournal.getDocumentTypes(), {
            blank: EnhancedJournalSheet
        });
    }

    get entitytype() {
        if (this.document instanceof Actor)
            return 'actor';

        let flags = this.document?.flags;
        let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'oldentry';

        if (this.document?.folder?.name == '_fql_quests')
            type = 'oldentry';

        return type;
    }

    async close(options) {
        if (options?.submit !== false) {
            this.saveScrollPos();

            if (await this?.subsheet?.close() === false)
                return false;

            MonksEnhancedJournal.journal = null;
            // if there's a sound file playing, then close it
            for (let [key, sound] of Object.entries(this._backgroundsound)) {
                sound.stop();
            }

            Hooks.off(game.modules.get("monks-sound-enhancements")?.active ? "globalSoundEffectVolumeChanged" : "globalInterfaceVolumeChanged", this._soundHook);

            return super.close(options);
        }
    }

    tabChange(tab, event) {
        log('tab change', tab, event);
    }

    canBack(tab) {
        if (tab == undefined)
            tab = this.tabs.active();
        if (tab == undefined)
            return false;
        return tab.history?.length > 1 && (tab.historyIdx == undefined || tab.historyIdx < tab.history.length - 1);
    }

    canForward(tab) {
        if (tab == undefined)
            tab = this.tabs.active();
        if (tab == undefined)
            return false;
        return tab.history?.length > 1 && tab.historyIdx && tab.historyIdx > 0;
    }

    async findEntity(entityId, text) {
        if (entityId == undefined)
            return new BlankJournal({ flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: "" });
        else {
            let entity;
            if (entityId.indexOf('.') >= 0) {
                try {
                    entity = await fromUuid(entityId);
                } catch (err) { log('Error find entity', entityId, err); }
            } else {
                if (entity == undefined)
                    entity = game.journal.get(entityId);
                if (entity == undefined)
                    entity = game.actors.get(entityId);
            }
            if (entity == undefined)
                entity = new BlankJournal({ name: text, flags: { 'monks-enhanced-journal': { type: 'blank' }, content: `${i18n("MonksEnhancedJournal.CannotFindEntity")}: ${text}` } });

            return entity;
        }
    }

    async deleteEntity(entityId){
        //an entity has been deleted, what do we do?
        for (let tab of this.tabs) {
            if (tab.entityId?.startsWith(entityId)) {
                tab.entity = await this.findEntity('', tab.text); //I know this will return a blank one, just want to maintain consistency
                tab.text = i18n("MonksEnhancedJournal.NewTab");
                $('.journal-tab[data-tabid="${tab.id}"] .tab-content', this.element).html(tab.text);
            }

            //remove it from the history
            tab.history = tab.history.filter(h => h != entityId);

            if (tab.active && this.rendered)
                this.render(true);  //if this entity was being shown on the active tab, then refresh the journal
        }

        this.saveTabs();
    }

    addTab(entity, options = { activate: true, refresh: true }) {
        if (entity?.currentTarget != undefined)
            entity = null;

        if (entity?.parent) {
            options.pageId = entity.id;
            entity = entity.parent;
        }

        let tab = {
            id: makeid(),
            text: entity?.name || i18n("MonksEnhancedJournal.NewTab"),
            active: false,
            entityId: entity?.uuid,
            entity: entity || new BlankJournal({ flags: { 'monks-enhanced-journal': { type: 'blank' }, content: i18n("MonksEnhancedJournal.NewTab") } }),
            pageId: options.pageId,
            anchor: options.anchor,
            history: []
        };
        if (tab.entityId != undefined)
            tab.history.push(tab.entityId);
        this.tabs.push(tab);

        if (options.activate)
            this.activateTab(tab);  //activating the tab should save it
        else {
            this.saveTabs();
            if (options.refresh)
                this.render(true, { focus: true });
        }

        this.updateRecent(tab.entity);

        return tab;
    }

    async activateTab(tab, event, options) {
        this.saveScrollPos();

        if (await this?.subsheet?.close() === false)
            return false;

        if (tab == undefined)
            tab = this.addTab();

        if (event != undefined)
            event.preventDefault();

        if (tab.currentTarget != undefined) {
            tab.preventDefault();
            tab = tab.currentTarget.dataset.tabid;
        }
        if (typeof tab == 'string')
            tab = this.tabs.find(t => t.id == tab);
        else if (typeof tab == 'number')
            tab = this.tabs[tab];

        if (event?.altKey) {
            // Open this outside of the Enhnaced Journal
            let document = await this.findEntity(tab?.entityId, tab?.text);
            if (document) {
                MonksEnhancedJournal.fixType(document);
                document.sheet.render(true);
            }
        } else if (event?.shiftKey) {
            // Close this tab
            this.removeTab(tab, event);
            tab = this.tabs.active(false);
            if (!tab) {
                if (this.tabs.length)
                    tab = this.tabs[0];
                else
                    tab = this.addTab();
            }
        }

        let currentTab = this.tabs.active(false);
        if (currentTab?.id != tab.id || this.subsheetElement == undefined || $(this.subsheetElement).is(":empty")) {
            tab.entity = await this.findEntity(tab.entityId, tab.text);
        }

        /*
        if (currentTab?.id == tab.id) {
            this.display(tab.entity);
            this.updateHistory();
            return false;
        }*/

        if (currentTab != undefined)
            currentTab.active = false;
        tab.active = true;

        if (this._tabs)
            this._tabs.active = null;

        //$('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
        //$('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));

        //$(`.journal-tab[data-tabid="${tab.id}"]`, this.element).addClass('active').siblings().removeClass('active');

        //this.display(tab.entity);

        this.saveTabs();

        //this.updateHistory();
        if (this.rendered)
            this.render(true, options);
        else {
            window.setTimeout(() => {
                $(`.journal-tab[data-tabid="${tab.id}"]`, this.element).addClass("active").siblings().removeClass("active");
            }, 100);
        }

        this.updateRecent(tab.entity);

        return true;
    }

    updateTab(tab, entity, options = {}) {
        if (!entity)
            return;

        if (entity?.parent) {
            options.pageId = entity.id;
            entity = entity.parent;
        }

        if (tab != undefined) {
            if (tab.entityId != entity.uuid) {
                tab.text = entity.name;
                tab.entityId = entity.uuid;
                tab.entity = entity;
                tab.pageId = options.pageId;
                tab.anchor = options.anchor;

                if ((game.user.isGM || setting('allow-player')) && tab.entityId != undefined) {    //only save the history if the player is a GM or they get the full journal experience... and if it's not a blank tab
                    if (tab.history == undefined)
                        tab.history = [];
                    if (tab.historyIdx != undefined) {
                        tab.history = tab.history.slice(tab.historyIdx);
                        tab.historyIdx = 0;
                    }
                    tab.history.unshift(tab.entityId);

                    if (tab.history.length > 10)
                        tab.history = tab.history.slice(0, 10);
                }

                this.saveTabs();

                //$(`.journal-tab[data-tabid="${tab.id}"]`, this.element).attr('title', tab.text).find('.tab-content').html(tab.text);
            } else if (tab.entity == undefined) {
                tab.entity = entity;
            }

            //$('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
            //$('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));
            //this.updateHistory();
            this.updateRecent(tab.entity);
        }

        if (!this.rendered)
            return;

        this.render(true, foundry.utils.mergeObject({ focus: true }, options));
    }

    removeTab(tab, event) {
        if (typeof tab == 'string')
            tab = this.tabs.find(t => t.id == tab);

        let idx = this.tabs.findIndex(t => t.id == tab.id);
        if (idx >= 0) {
            this.tabs.splice(idx, 1);
            $('.journal-tab[data-tabid="' + tab.id + '"]', this.element).remove();
        }

        if (this.tabs.length == 0) {
            this.addTab();
        } else {
            if (tab.active) {
                let nextIdx = (idx >= this.tabs.length ? idx - 1 : idx);
                if (!this.activateTab(nextIdx))
                    this.saveTabs();
            }
        }

        if (event != undefined)
            event.preventDefault();
    }

    saveTabs() {
        let update = this.tabs.map(t => {
            let entity = t.entity;
            delete t.entity;
            let tab = foundry.utils.duplicate(t);
            t.entity = entity;
            delete tab.element;
            delete tab.entity;
            //delete tab.history;  //technically we could save the history if it's just an array of ids
            //delete tab.historyIdx;
            delete tab.userdata;
            return tab;
        });
        game.user.update({
            flags: { 'monks-enhanced-journal': { 'tabs': update } }
        }, { render: false });
    }

    updateTabNames(uuid, name) {
        for (let tab of this.tabs) {
            if (tab.entityId == uuid) {
                $(`.journal-tab[data-tabid="${tab.id}"] .tab-content`, this.element).attr("title", name).html(name);
                tab.text = name;
                this.saveTabs();
                if (tab.active) {
                    $('.window-title', this.element).html((tab.text || i18n("MonksEnhancedJournal.NewTab")) + ' - ' + i18n("MonksEnhancedJournal.AppName"));
                }
            }
        }
    }

    navigateFolder(event) {
        let ctrl = event.currentTarget;
        let id = ctrl.dataset.entityId;

        if (id == '')
            return;

        let entity = game.journal.find(j => j.id == id);
        this.open(entity);
    }

    navigateHistory(event) {
        if (!$(event.currentTarget).hasClass('disabled')) {
            let dir = event.currentTarget.dataset.history;
            let tab = this.tabs.active();

            if (tab.history.length > 1) {
                let result = true;
                let idx = 0;
                do {
                    idx = ((tab.historyIdx == undefined ? 0 : tab.historyIdx) + (dir == 'back' ? 1 : -1));
                    result = this.changeHistory(idx);
                } while (!result && idx > 0 && idx < tab.history.length )
            }
        }
        event.preventDefault();
    }

    async changeHistory(idx) {
        let tab = this.tabs.active();
        tab.historyIdx = Math.clamp(idx, 0, (tab.history.length - 1));

        tab.entityId = tab.history[tab.historyIdx];
        tab.entity = await this.findEntity(tab.entityId, tab.text);
        tab.text = tab.entity.name;

        this.saveTabs();

        this.render(true, { autoPage: true } );

        this.updateRecent(tab.entity);

        //$('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
        //$('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));

        return (tab?.entity?.id != undefined);
    }

    async getHistory() {
        let index = 0;
        let tab = this.tabs.active();
        let menuItems = [];

        if (tab?.history == undefined)
            return;

        for (let i = 0; i < tab.history.length; i++) {
            let h = tab.history[i];
            let entity = await this.findEntity(h, '');
            if (tab?.entity?.id != undefined) {
                let type = (entity.getFlag && entity.getFlag('monks-enhanced-journal', 'type'));
                let icon = MonksEnhancedJournal.getIcon(type);
                let item = {
                    name: entity.name || i18n("MonksEnhancedJournal.Unknown"),
                    icon: `<i class="fas ${icon}"></i>`,
                    callback: (li) => {
                        let idx = i;
                        this.changeHistory(idx)
                    }
                }
                menuItems.push(item);
            }
        };

        return menuItems;
    }

    addBookmark() {
        //get the current tab and save the entity and name
        let tab = this.tabs.active();

        if (tab?.entityId == undefined)
            return;

        if (this.bookmarks.find(b => b.entityId == tab.entityId) != undefined) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.MsgOnlyOneBookmark"));
            return;
        }

        let entitytype = function(entity) {
            if (entity instanceof Actor)
                return 'actor';

            let type = foundry.utils.getProperty(entity, "flags.monks-enhanced-journal.type") || 'journalentry';

            return type;
        }

        let bookmark = {
            id: makeid(),
            entityId: tab.entityId,
            text: tab.entity.name,
            icon: MonksEnhancedJournal.getIcon(entitytype(tab.entity))
        }

        this.bookmarks.push(bookmark);

        $('<div>')
            .addClass('bookmark-button')
            .attr({ title: bookmark.text, 'data-bookmark-id': bookmark.id, 'data-entity-id': bookmark.entityId })
            .html(`<i class="fas ${bookmark.icon}"></i> ${bookmark.text}`)
            .appendTo('.bookmark-bar', this.element).get(0).click(this.activateBookmark.bind(this));

        this.saveBookmarks();
    }

    async activateBookmark(event) {
        let id = event.currentTarget.dataset.bookmarkId;
        let bookmark = this.bookmarks.find(b => b.id == id);
        let entity = await this.findEntity(bookmark.entityId, bookmark.text);
        this.open(entity, setting("open-new-tab"));
    }

    removeBookmark(bookmark) {
        this.bookmarks.findSplice(b => b.id == bookmark.id);
        $(`.bookmark-button[data-bookmark-id="${bookmark.id}"]`, this.element).remove();
        this.saveBookmarks();
    }

    saveBookmarks() {
        let update = this.bookmarks.map(b => {
            let bookmark = foundry.utils.duplicate(b);
            return bookmark;
        });
        game.user.setFlag('monks-enhanced-journal', 'bookmarks', update);
    }

    async open(entity, newtab, options) {
        //if there are no tabs, then create one
        if (this.tabs.length == 0) {
            this.addTab(entity);
        } else {
            if (newtab === true) {
                //the journal is getting created
                //lets see if we can find  tab with this entity?
                let tab = this.tabs.find(t => t.entityId?.includes(entity.id));
                if (tab != undefined)
                    this.activateTab(tab, null, options);
                else
                    this.addTab(entity);
            } else {
                if (await this?.subsheet?.close() !== false) {
                    // Check to see if this entity already exists in the tab list
                    let tab = this.tabs.find(t => t.entityId?.includes(entity.id));
                    if (tab != undefined)
                        this.activateTab(tab, null, options);
                    else
                        this.updateTab(this.tabs.active(), entity, options);
                }
            }
        }
    }

    async updateRecent(entity) {
        if (entity.id && entity.type != "blank") {
            let recent = game.user.getFlag("monks-enhanced-journal", "_recentlyViewed") || [];
            recent.findSplice(e => e.id == entity.id || typeof e != 'object');
            recent.unshift({ id: entity.id, uuid: entity.uuid, name: entity.name, type: entity.getFlag("monks-enhanced-journal", "type") });
            if (recent.length > 5)
                recent = recent.slice(0, 5);
            await game.user.update({
                flags: { 'monks-enhanced-journal': { '_recentlyViewed': recent } }
            }, { render: false });
        }
    }

    expandSidebar() {
        this._collapsed = false;
        $('.enhanced-journal', this.element).removeClass('collapse');
        $('.sidebar-toggle', this.element).attr('data-tooltip', i18n("MonksEnhancedJournal.CollapseDirectory"));
        $('.sidebar-toggle i', this.element).removeClass('fa-caret-left').addClass('fa-caret-right');
    }

    collapseSidebar() {
        this._collapsed = true;
        $('.enhanced-journal', this.element).addClass('collapse');
        $('.sidebar-toggle', this.element).attr('data-tooltip', i18n("MonksEnhancedJournal.ExpandDirectory"));
        $('.sidebar-toggle i', this.element).removeClass('fa-caret-right').addClass('fa-caret-left');
    }

    _randomizePerson() {
        //randomize first name, last name, race, gender, profession
        //check first to see if the field needs to be rendomized, or if the fields are filled in
    }

    searchText(query) {
        let that = this;
        $('.editor-parent .editor.editor-display,.journal-entry-content', this.element).unmark().mark(query, {
            wildcards: 'enabled',
            accuracy: "complementary",
            separateWordSearch: false,
            noMatch: function () {
                if (query != '')
                    $('.mainbar .navigation .search', that.element).addClass('error');
            },
            done: function (total) {
                if (query == '')
                    $('.mainbar .navigation .search', that.element).removeClass('error');
                if (total > 0) {
                    $('.mainbar .navigation .search', that.element).removeClass('error');
                    let first = $('.editor-parent .editor.editor-display mark:first,.journal-entry-content .scrollable mark:first', that.element);
                    $('.editor', that.element).parent().scrollTop(first.position().top - 10);
                    $('.scrollable', that.element).scrollTop(first.position().top - 10);
                }
            }
        });
    }

    _canDragStart(selector) {
        if (selector == ".journal-tab") return true;

        if (this.subsheet)
            return this.subsheet._canDragStart(selector);
        else
            return true;// super._canDragStart(selector);
    }

    _canDragDrop(selector) {
        if (this.subsheet)
            return this.subsheet._canDragDrop(selector);
        else
            return true;
    }

    _onDragStart(event) {
        const target = event.currentTarget;

        if ($(target).hasClass('journal-tab')) {
            const dragData = { from: this.document.uuid };

            let tabid = target.dataset.tabid;
            let tab = this.tabs.find(t => t.id == tabid);
            dragData.uuid = tab.entityId;
            dragData.type = "JournalTab";
            dragData.tabid = tabid;

            log('Drag Start', dragData);

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        } else if ($(target).hasClass('bookmark-button')) {
            const dragData = { from: this.document.uuid };

            let bookmarkId = target.dataset.bookmarkId;
            let bookmark = this.bookmarks.find(t => t.id == bookmarkId);
            dragData.uuid = bookmark.entityId;
            dragData.type = "Bookmark";
            dragData.bookmarkId = bookmarkId;

            log('Drag Start', dragData);

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        } else
            return this.subsheet._onDragStart(event);
    }

    async _onDrop(event) {
        log('enhanced journal drop', event);
        let result = $(event.currentTarget).hasClass('enhanced-journal-header') ? false : this.subsheet._onDrop(event);

        if (result instanceof Promise)
            result = await result;

        if (result === false) {
            let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

            if (data.tabid) {
                const target = event.target.closest(".journal-tab") || null;
                let tabs = foundry.utils.duplicate(this.tabs);

                if (data.tabid === target.dataset.tabid) return; // Don't drop on yourself

                let from = tabs.findIndex(a => a.id == data.tabid);
                let to = tabs.findIndex(a => a.id == target.dataset.tabid);
                log('moving tab from', from, 'to', to);
                tabs.splice(to, 0, tabs.splice(from, 1)[0]);

                this.tabs = tabs;
                this.tabs.active = (findone = true) => {
                    let tab = this.tabs.find(t => t.active);
                    if (findone) {
                        if (tab == undefined && this.tabs.length > 0)
                            tab = this.tabs[0];
                    }
                    return tab;
                };

                if (from < to)
                    $('.journal-tab[data-tabid="' + data.tabid + '"]', this.element).insertAfter(target);
                else
                    $('.journal-tab[data-tabid="' + data.tabid + '"]', this.element).insertBefore(target);

                game.user.update({
                    flags: { 'monks-enhanced-journal': { 'tabs': tabs } }
                }, { render: false });
            } else if (data.bookmarkId) {
                const target = event.target.closest(".bookmark-button") || null;
                let bookmarks = foundry.utils.duplicate(this.bookmarks);

                if (data.bookmarkId === target.dataset.bookmarkId) return; // Don't drop on yourself

                let from = bookmarks.findIndex(a => a.id == data.bookmarkId);
                let to = bookmarks.findIndex(a => a.id == target.dataset.bookmarkId);
                log('moving bookmark from', from, 'to', to);
                bookmarks.splice(to, 0, bookmarks.splice(from, 1)[0]);

                this.bookmarks = bookmarks;
                if (from < to)
                    $('.bookmark-button[data-bookmark-id="' + data.bookmarkId + '"]', this.element).insertAfter(target);
                else
                    $('.bookmark-button[data-bookmark-id="' + data.bookmarkId + '"]', this.element).insertBefore(target);

                game.user.update({
                    flags: { 'monks-enhanced-journal': { 'bookmarks': bookmarks } }
                }, { render: false });
            } else if (data.type == 'Actor') {
                if (data.pack == undefined) {
                    let actor = await fromUuid(data.uuid);
                    if (actor && actor instanceof Actor)
                        this.open(actor, setting("open-new-tab"));
                }
            } else if (data.type == 'JournalEntry') {
                let entity = await fromUuid(data.uuid);
                if (entity)
                    this.open(entity, setting("open-new-tab"));
            }     
            log('drop data', event, data);
        }

        return result;
    }

    async _onSubmitForm(formConfig, event) {
        let form = $("form", this.form).get(0);
        if (!form) throw new Error("The FormApplication subclass has no registered form element");
        const formData = new foundry.applications.ux.FormDataExtended(form, { editors: this.editors });
        await this.subsheet.constructor.onSubmit.call(this.subsheet, event, form, formData);
    }

    /*
    _prepareSubmitData(event, form, formData, updateData) {
        if (this._sheetMode === "image") {
            updateData.name = updateData.title;
            delete updateData["title"];
            updateData.img = updateData.image;
            delete updateData["image"];
        }
        return super._prepareSubmitData(event, form, formData, updateData);
    }

    static onSubmit(event, form, formData) {
        this.subsheet.onSubmit.call(this, event, form, formData);
    }
    */

    async _onSwapMode(event, mode) {
        //don't do anything, but leave this here to prevent the regular journal page from doing anything
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();

        buttons.unshift({
            label: i18n("MonksEnhancedJournal.Maximize"),
            class: "toggle-fullscreen",
            icon: "fas fa-expand-arrows-alt",
            onclick: this.fullscreen.bind(this)
        });

        return buttons;
    }

    static doShowPlayers(event) {
        if (event.shiftKey)
            this.subsheet.constructor._onShowPlayers.call(this.subsheet, event, null, { users: null, showAs: "journal" });
        else if (event.ctrlKey)
            this.subsheet.constructor._onShowPlayers.call(this.subsheet, event, null, { users: null, showAs: "image" });
        else {
            this.subsheet.constructor._onShowPlayers.call(this.subsheet, event);
        }
    }

    fullscreen() {
        if (this.element.hasClass("maximized")) {
            this.element.removeClass("maximized");
            $('.toggle-fullscreen', this.element).html(`<i class="fas fa-expand-arrows-alt"></i>${i18n("MonksEnhancedJournal.Maximize")}`);
            this.setPosition({ width: this._previousPosition.width, height: this._previousPosition.height });
            this.setPosition({ left: this._previousPosition.left, top: this._previousPosition.top });
        } else {
            this.element.addClass("maximized");
            $('.toggle-fullscreen', this.element).html(`<i class="fas fa-compress-arrows-alt"></i>${i18n("MonksEnhancedJournal.Restore")}`);
            
            this._previousPosition = foundry.utils.duplicate(this.position);
            this.setPosition({ left: 0, top: 0 });
            this.setPosition({ height: $('body').height(), width: $('body').width() - $('#sidebar').width() });
        }
    }

    cancelSend(id, showpic) {
        MonksEnhancedJournal.emit("cancelShow", {
            showid: id,
            userId: game.user.id
        });
    }

    _onSelectFile(selection, filePicker, event) {
        log(selection, filePicker, event);
        let updates = {};
        updates[filePicker.field.name] = selection;
        this.document.update(updates);
    }

    async convert(type, sheetClass) {
        this.document._sheet = null;
        MonksEnhancedJournal.fixType(this.document, type);
        await this.document.setFlag('monks-enhanced-journal', 'type', type);
        if (sheetClass)
            await this.document.setFlag('core', 'sheetClass', sheetClass);
        await ui.journal.render(true);
        //MonksEnhancedJournal.updateDirectory($('#journal'));
    }

    async _createContextMenus(html) {
        this._context = new foundry.applications.ux.ContextMenu(html, ".bookmark-button", [
            {
                name: "Open outside Enhanced Journal",
                icon: '<i class="fas fa-file-export"></i>',
                callback: async (li) => {
                    let bookmark = this.bookmarks.find(b => b.id == li.dataset.bookmarkId);
                    let document = await fromUuid(bookmark.entityId);
                    if (!document) {
                        document = game.journal.get(bookmark.entityId);
                    }
                    if (document) {
                        MonksEnhancedJournal.fixType(document);
                        document.sheet.render(true);
                    } else {
                        ui.notifications.warn(i18n("MonksEnhancedJournal.CannotFindEntity"));
                    }
                }
            },
            {
                name: "Open in new tab",
                icon: '<i class="fas fa-file-export"></i>',
                callback: async (li) => {
                    let bookmark = this.bookmarks.find(b => b.id == li.dataset.bookmarkId);
                    let document = await fromUuid(bookmark.entityId);
                    if (!document) {
                        document = game.journal.get(bookmark.entityId);
                    }
                    if (document) {
                        MonksEnhancedJournal.fixType(document);
                        this.open(document, true);
                    }
                }
            },
            {
                name: "MonksEnhancedJournal.Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    const bookmark = this.bookmarks.find(b => b.id === li.dataset.bookmarkId);
                    this.removeBookmark(bookmark);
                }
            }
        ], { fixed: true, jQuery: false });

        this._tabcontext = new foundry.applications.ux.ContextMenu(html, ".enhanced-journal-header .tab-bar", [
            {
                name: "Open outside Enhanced Journal",
                icon: '<i class="fas fa-file-export"></i>',
                condition: (li) => {
                    let tab = this.tabs.find(t => t.id == this.contextTab);
                    if (!tab) return false;
                    return !["blank", "folder"].includes(tab.entity?.type);
                },
                callback: async (li) => {
                    let tab = this.tabs.find(t => t.id == this.contextTab);
                    if (!tab) return;
                    let document = tab.entity;
                    if (!tab.entity) {
                        document = await fromUuid(tab.entityId);
                    }
                    if (document) {
                        MonksEnhancedJournal.fixType(document);
                        document.sheet.render(true);
                    }
                }
            },
            {
                name: "Close Tab",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    let tab = this.tabs.find(t => t.id == this.contextTab);
                    if (tab)
                        this.removeTab(tab);
                }
            },
            {
                name: "Close All Tabs",
                icon: '<i class="fas fa-dumpster"></i>',
                callback: li => {
                    this.tabs.splice(0, this.tabs.length);
                    this.saveTabs();
                    this.addTab();
                }
            },
            {
                name: "Close Other Tabs",
                icon: '<i class="fas fa-dumpster"></i>',
                callback: li => {
                    let tab = this.tabs.find(t => t.id == this.contextTab);
                    if (tab) {
                        let idx = this.tabs.findIndex(t => t.id == this.contextTab);
                        this.tabs.splice(0, idx);
                        this.tabs.splice(1, this.tabs.length);
                        this.saveTabs();
                        this.render();
                    }
                }
            },
            {
                name: "Close To the right",
                icon: '<i class="fas fa-dumpster"></i>',
                callback: li => {
                    let tab = this.tabs.find(t => t.id == this.contextTab);
                    if (tab) {
                        let idx = this.tabs.findIndex(t => t.id == this.contextTab);
                        this.tabs.splice(idx + 1, this.tabs.length);
                        this.saveTabs();
                        this.render();
                    }
                }
            }
        ], { fixed: true, jQuery: false });
        $('.tab-bar', this.element).on("contextmenu", (event) => {
            var r = document.querySelector(':root');
            let tab = event.target.closest(".journal-tab");
            if (!tab) {
                event.stopPropagation();
                event.preventDefault();
                return false;
            }
            let x = $(tab).position().left;
            r.style.setProperty('--mej-context-x', x + "px");
        });
        $('.tab-bar .journal-tab', this.element).on("contextmenu", (event) => {
            this.contextTab = event.currentTarget.dataset.tabid;
        });
        $('.bookmark-bar .bookmark-button', this.element).on("contextmenu", (event) => {
            this.contextBookmark = event.currentTarget.dataset.bookmarkId;
        });

        let history = await this.getHistory();
        this._historycontext = new foundry.applications.ux.ContextMenu(this.element, ".mainbar .navigation .nav-button.history", history, { fixed: true, jQuery: false });
        this._imgcontext = new foundry.applications.ux.ContextMenu(this.element, ".journal-body.oldentry .tab.picture", [
            {
                name: "MonksEnhancedJournal.Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    log('Remove image on old entry');
                }
            }
        ], { fixed: true, jQuery: false });
    }

    async _onChangeInput(event) {
        return this.subsheet._onChangeInput(event);
    }

    _activateFilePicker(event) {
        return this.subsheet._activateFilePicker(event);
    }

    activateDirectoryListeners(html) {   
        $('.sidebar-toggle', html).on('click', () => {
            if (this._collapsed)
                this.expandSidebar();
            else
                this.collapseSidebar();
        });

        ui.journal._createContextMenu(ui.journal._getFolderContextOptions, ".folder .folder-header", {
            fixed: true,
            hookName: "getFolderContextOptions",
            parentClassHooks: false,
            container: html
        });
        ui.journal._createContextMenu(ui.journal._getEntryContextOptions, ".directory-item[data-entry-id]", {
            fixed: true,
            hookName: `get${ui.journal.documentName}ContextOptions`,
            parentClassHooks: false,
            container: html
        });

        const directory = $(".directory-list", html);

        // Directory-level events
        $(`[data-folder-depth="${this.maxFolderDepth}"] .create-folder`, html).remove();
        $('.toggle-sort', html).click((event) => {
            event.preventDefault();
            ui.journal.collection.toggleSortingMode();
            ui.journal.render();
        });
        $('.collapse-all', html).click(ui.journal.collapseAll.bind(this));

        // Intersection Observer
        /*
        const observer = new IntersectionObserver(ui.journal._onLazyLoadImage.bind(this), { root: directory[0] });
        entries.each((i, li) => observer.observe(li));
        */

        // Entry-level events
        directory.on("click", ".entry-name", ui.journal._onClickEntry.bind(ui.journal));
        directory.on("click", ".folder-header", (event) => {
            ui.journal._onToggleFolder.call(this, event.originalEvent, event.currentTarget, { _skipDeprecation:true });
        });
        const dh = ui.journal._onDragHighlight.bind(this);
        $(".folder", html).on("dragenter", dh).on("dragleave", dh);
        //this._contextMenu(html);

        // Allow folder and entry creation
        if (ui.journal._canCreateFolder) $(".create-folder", html).click((event) => { ui.journal._onCreateFolder.call(ui.journal, event.originalEvent, event.currentTarget) });
        if (ui.journal._canCreateEntry) $(".create-entry", html).click((event) => { ui.journal._onCreateEntry.call(ui.journal, event.originalEvent, event.currentTarget) });

        this._searchFilters = [new foundry.applications.ux.SearchFilter({ inputSelector: 'input[name="search"]', contentSelector: ".directory-list", callback: ui.journal._onSearchFilter.bind(ui.journal) })];
        this._searchFilters.forEach(f => f.bind(html));

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".directory-item",
            dropSelector: ".directory-list",
            permissions: {
                dragstart: ui.journal._canDragStart.bind(ui.journal),
                drop: ui.journal._canDragDrop.bind(ui.journal)
            },
            callbacks: {
                dragover: ui.journal._onDragOver.bind(ui.journal),
                dragstart: ui.journal._onDragStart.bind(ui.journal),
                drop: ui.journal._onDrop.bind(ui.journal)
            }
        }).bind(html);
        html.querySelectorAll(".directory-item.folder").forEach(folder => {
            folder.addEventListener("dragenter", ui.journal._onDragHighlight.bind(ui.journal));
            folder.addEventListener("dragleave", ui.journal._onDragHighlight.bind(ui.journal));
        });
    }

    activateFooterListeners(html) {
        let folder = (this.document.folder || this.document.parent?.folder);
        let content = folder ? folder.contents : ui.journal.collection.tree?.entries || ui.journal.documents;
        let sorting = folder?.sorting || ui.journal.collection.sortingMode || "m";
        
        let documents = content
            .map(c => {
                if (c.testUserPermission && !c.testUserPermission(game.user, "OBSERVER"))
                    return null;
                return {
                    id: c.id,
                    name: c.name || "",
                    sort: c.sort
                }
            })
            .filter(d => !!d)
            .sort((a, b) => {
                return sorting == "m" ? a.sort - b.sort : a.name.localeCompare(b.name);
            })
        let idx = documents.findIndex(e => e.id == this.document.id || e.id == this.document.parent?.id);

        let prev = (idx > 0 ? documents[idx - 1] : null);
        let next = (idx < documents.length - 1 ? documents[idx + 1] : null);
        $('.navigate-prev', html).toggle(!["blank", "folder"].includes(this.document.type)).toggleClass('disabled', !prev).attr("data-tooltip", prev?.name);
        $('.navigate-next', html).toggle(!["blank", "folder"].includes(this.document.type)).toggleClass('disabled', !next).attr("data-tooltip", next?.name);

        $('.page-prev', html).toggle(this.document instanceof JournalEntry);
        $('.page-next', html).toggle(this.document instanceof JournalEntry);
    }

    getDocuments() {
        let folder = this.document.folder;
        let contents = folder?.contents || game.journal.filter(j => j.folder == null);

        let sortingMode = folder?.sorting || ui.journal.collection.sortingMode || "m";

        let documents = contents
            .map(c => {
                if (c.testUserPermission && !c.testUserPermission(game.user, "OBSERVER"))
                    return null;
                return {
                    id: c.id,
                    name: c.name || "",
                    sort: c.sort
                }
            })
            .filter(d => !!d)
            .sort((a, b) => {
                return sortingMode == "m" ? a.sort - b.sort : a.name.localeCompare(b.name);
            });
        return documents;
    }

    static navigatePrevious(event, target) {
        let documents = this.getDocuments();
        let idx = documents.findIndex(e => e.id == this.document.id || e.id == this.document.parent?.id);

        let page = (idx > 0 ? documents[idx - 1] : null);
        if (!page?.id)
            return;
        let journal = game.journal.get(page.id);
        if (journal) this.open(journal);
    }

    static navigateNext(event, target) {
        let documents = this.getDocuments();
        let idx = documents.findIndex(e => e.id == this.document.id || e.id == this.document.parent?.id);

        let page = (idx < documents.length - 1 ? documents[idx + 1] : null);
        if (!page?.id)
            return;
        let journal = game.journal.get(page.id);
        if (journal) this.open(journal);
    }
}