import { setting, i18n, format, log, warn, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname, getVolume } from "../monks-enhanced-journal.js";
import { CustomisePage } from "../apps/customise-page.js";
import { EditSound } from "../apps/editsound.js";
import { MakeOffering } from "../apps/make-offering.js";
import { getValue, setValue, setPrice, MEJHelpers } from "../helpers.js";
const { HandlebarsApplicationMixin } = foundry.applications.api

export class EnhancedJournalSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.journal.JournalEntryPageSheet) {
    constructor(options = {}) {
        super(options);

        this.document._itemList = this.document._itemList || {};
        this.enhancedjournal = options.enhancedjournal;

        try {
            this._scrollPositions = JSON.parse(this.document.flags['monks-enhanced-journal']?.scrollPos || {});
        } catch (e) { }
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ['monks-enhanced-journal'],
        window: {
            contentClasses: ['monks-journal-sheet', "sheet", "standard-form"],
            icon: "fa-solid fa-book-open",
            resizable: true,
            /*
            controls: [{
                icon: "fa-solid fa-gear",
                label: "SHEETS.ConfigureSheet",
                action: "configureSheet",
                visible: true
            }]
            */
        },
        actions: {
            configureSheet: EnhancedJournalSheet.onConfigureSheet,
            convertSheet: EnhancedJournalSheet.convertSheet,
            showPlayers: EnhancedJournalSheet._onShowPlayers,
            resetScale: EnhancedJournalSheet.clearScale,
            playSound: EnhancedJournalSheet.toggleSound,
            addSound: EnhancedJournalSheet.onAddSound,
            editDescription: EnhancedJournalSheet.onEditDescription,
            editNotes: EnhancedJournalSheet.onEditNotes,
            splitJournal: EnhancedJournalSheet.splitJournal,
            findMapEntry: EnhancedJournalSheet.findMapEntry,
            editFields: EnhancedJournalSheet.onEditFields,
            addImage: EnhancedJournalSheet.onAddImage,
            showImage: EnhancedJournalSheet.onImageDblClick,
            contextImage: EnhancedJournalSheet.onImageContext,
            openRelationship: EnhancedJournalSheet.onOpenRelationship,
            revealRelationship: EnhancedJournalSheet.onRevealRelationship,
            toggleRelationship: EnhancedJournalSheet.onHideItem,
            deleteRelationship: EnhancedJournalSheet.onDeleteItem,
            openOfferingActor: EnhancedJournalSheet.onOpenOfferingActor,
            makeOffering: EnhancedJournalSheet.onMakeOffering,
            cancelOffer: EnhancedJournalSheet.onCancelOffer,
            acceptOffer: EnhancedJournalSheet.onAcceptOffer,
            rejectOffer: EnhancedJournalSheet.onRejectOffer,
            editItem: EnhancedJournalSheet.editItem,
            clearItems: EnhancedJournalSheet.clearAllItems,
            hideItem: EnhancedJournalSheet.onHideItem,
            lockItem: EnhancedJournalSheet.onLockItem,
            deleteItem: EnhancedJournalSheet.onDeleteItem,
            itemSummary: EnhancedJournalSheet.onItemSummary,
            changePlayerOwnership: EnhancedJournalSheet.onChangePlayerPermissions,
            copyUuid: EnhancedJournalSheet.onCopyUuid,
            copyImage: EnhancedJournalSheet.onCopyImage,
            openActor: EnhancedJournalSheet.onOpenActor,
            generateName: EnhancedJournalSheet.onGenerateName,
        },
        form: {
            closeOnSubmit: false,
            submitOnClose: true,
            submitOnChange: true,
            handler: EnhancedJournalSheet.onSubmit
        },
        position: {
            width: 1025,
            height: 700,
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/blank.html"
        }
    };

    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);

        const { colorScheme } = game.settings.get("core", "uiConfig");
        const theme = foundry.applications.apps.DocumentSheetConfig.getSheetThemeForDocument(options.document);
        options.classes.push("themed", `theme-${theme || colorScheme.applications || "dark"}`);

        options.window.contentClasses.push(this.constructor.type);

        if (game.modules.get("rippers-ui")?.active)
            options.classes.push('rippers-ui');
        if (game.modules.get("rpg-styled-ui")?.active)
            options.classes.push('rpg-styled-ui');
        if (!setting("show-bookmarkbar"))
            options.classes.push('hide-bookmark');

        return options;
    }

    get title() {
        return this.document?.name || i18n("MonksEnhancedJournal.NewTab");
    }

    get classes() {
        let classes = [this.constructor.type];
        for (const cls of this.constructor.inheritanceChain()) {
            if (cls.hasOwnProperty("DEFAULT_OPTIONS")) classes = classes.concat(cls.DEFAULT_OPTIONS.window?.contentClasses || []);
        }
        return classes;
    }

    get actions() {
        let actions = {};
        for (const cls of this.constructor.inheritanceChain()) {
            if (cls.hasOwnProperty("DEFAULT_OPTIONS") && cls.DEFAULT_OPTIONS.actions) {
                actions = foundry.utils.mergeObject(actions, cls.DEFAULT_OPTIONS.actions, { overwrite:false });
            }
        }
        return actions;
    }

    static get type() {
        return 'blank';
    }

    get form() {
        if (this.enhancedjournal)
            return $("form", this.enhancedjournal.form).get(0);
        return super.form;
    }

    get trueElement() {
        if (this.enhancedjournal)
            return this.enhancedjournal.subsheetElement;
        return this.element;
    }

    static sheetSettings() {
        let settingDefault = (game.settings.settings.get("monks-enhanced-journal.sheet-settings")?.default || {})[this.type] || {};
        let sheetSettings = (setting("sheet-settings") || {})[this.type] || {};
        return foundry.utils.mergeObject(foundry.utils.duplicate(settingDefault), foundry.utils.duplicate(sheetSettings));
    }

    sheetSettings() {
        let sheetSettings = this.constructor.sheetSettings();
        let settings = foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.sheet-settings") || {};
        return foundry.utils.mergeObject(sheetSettings, foundry.utils.duplicate(settings));
    }

    get allowedRelationships() {
        return ["encounter", "loot", "organization", "person", "place", "poi", "event", "quest", "shop"];
    }

    _canUserView(user) {
        if (this.document.compendium) return user.isGM || this.document.compendium.visible;
        return this.document.parent.testUserPermission(user, this.options.viewPermission);
    }

    _getHeaderButtons() {
        let buttons = [];

        let canConfigure = this.isEditable && game.user.isGM;
        if (!canConfigure)
            buttons.findSplice(b => b.class == "configure-sheet");

        buttons.findSplice(b => b.class == "entry-text");
        buttons.findSplice(b => b.class == "entry-image");

        return buttons;
    }

    _getHeaderControls() {
        if (this.enhancedjournal)
            return [];
        return this._documentControls().filter(c => !c.type || c.type == "button");
    }

    static get defaultObject() {
        return {};
    }

    get canPlaySound() {
        return true;
    }

    _prepareTabs(group) {
        let tabs = super._prepareTabs(group);

        // Remove any tabs that are set to not shown in the settings
        let sheetTabs = this.sheetSettings().tabs;
        if (!!sheetTabs) {
            for (let [key, value] of Object.entries(this.sheetSettings().tabs)) {
                if (value.shown === false) {
                    delete tabs[key];
                }
            }
        }

        if (!game.user.isGM) {
            // Remove any tabs that don't have content if the user isn't a GM
            if (Object.keys(foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.relationships") || {}).length === 0) {
                delete tabs.relationships;
            }
        }

        return tabs;
    }

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "main":
                await this._prepareBodyContext(context, options);
                context.subtabs = this._prepareTabs("primary");
                break;
        }

        return context;
    }

    async _prepareBodyContext(context, options) {
        context = foundry.utils.mergeObject(context, {
            type: this.constructor.type,
            cssClass: this.isEditable ? "editable" : "locked",
            //editable: this.isEditable,
            data: (this.document?.toObject ? this.document?.toObject(false) : {}),
            //content: this.document?.content,
            //options: this.options,
            owner: this.document.isOwner,
            //userid: game.user.id,
            icon: MonksEnhancedJournal.getIcon(this.constructor.type),
            notesTarget: `flags.monks-enhanced-journal.${game.user.id}.notes`,

            name: this.document.name,
            src: this.document.src,
            text: this.document.text,

            entrytype: this.constructor.type,
            isGM: game.user.isGM,
            hasGM: (game.users.find(u => u.isGM && u.active) != undefined),

            sheetSettings: this.sheetSettings() || {}
        });

        //this._convertFormats(data);
        const enrichmentOptions = {
            secrets: this.document.isOwner,
            relativeTo: this.document,
            async: true
        };
        context.enrichedText = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.text?.content, enrichmentOptions);

        /*
        if (game.system.id == "pf2e") {
            context.data.content = await game.pf2e.TextEditor.enrichHTML(context.data.content, { secrets: game.user.isGM, async: true });
        }
        */

        context.userdata = foundry.utils.getProperty(context.source, `flags.monks-enhanced-journal.${context.user.id}`);
        if (context.userdata) {
            context.userdata.enrichedText = await foundry.applications.ux.TextEditor.implementation.enrichHTML((context.userdata.notes || ""), {
                relativeTo: this.document,
                secrets: true,
                async: true
            });
        }

        if (this.canPlaySound) {
            context.sound = (foundry.utils.getProperty(context.source, "flags.monks-enhanced-journal.sound") || {});
            if (this.enhancedjournal)
                context.sound.playing = (this.enhancedjournal._backgroundsound || {})[this.document.id]?.playing;
            else
                context.sound.playing = this._backgroundsound?.playing;
        }

        return context;
    }

    static async convertSheet(event, target) {
        let context = {
            options: [
                { id: "encounter", name: "MonksEnhancedJournal.sheettype.encounter", disabled: this.constructor.type == "encounter" },
                { id: "event", name: "MonksEnhancedJournal.sheettype.event", disabled: this.constructor.type == "event" },
                { id: "loot", name: "MonksEnhancedJournal.sheettype.loot", disabled: this.constructor.type == "loot" },
                { id: "organization", name: "MonksEnhancedJournal.sheettype.organization", disabled: this.constructor.type == "organization" },
                { id: "person", name: "MonksEnhancedJournal.sheettype.person", disabled: this.constructor.type == "person" },
                { id: "place", name: "MonksEnhancedJournal.sheettype.place", disabled: this.constructor.type == "place" },
                { id: "poi", name: "MonksEnhancedJournal.sheettype.poi", disabled: this.constructor.type == "poi" },
                { id: "quest", name: "MonksEnhancedJournal.sheettype.quest", disabled: this.constructor.type == "quest" },
                { id: "shop", name: "MonksEnhancedJournal.sheettype.shop", disabled: this.constructor.type == "shop" },
                { id: "picture", name: "MonksEnhancedJournal.sheettype.picture", disabled: this.constructor.type == "picture" },
                { id: "text", name: "MonksEnhancedJournal.sheettype.journalentry", disabled: this.constructor.type == "text" },
            ],
            sheetType: i18n(`MonksEnhancedJournal.sheettype.${this.constructor.type}`)
        };
        let html = await foundry.applications.handlebars.renderTemplate("modules/monks-enhanced-journal/templates/convert.html", context);
        let that = this;
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: `Convert Sheet`,
            },
            content: html,
            yes: {
                callback: (event, button) => {
                    const form = button.form;
                    const fd = new foundry.applications.ux.FormDataExtended(form).object;

                    that.document.setFlag('monks-enhanced-journal', 'type', fd.convertTo);
                }
            }
        });
    }

    /*
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
    */

    refresh() { }

    get isEditable() {
        if (this.enhancedjournal && !this.enhancedjournal.isEditable)
            return false;

        return this.document.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && this.document?.compendium?.locked !== true;
    }

    fieldlist() {
        return null;
    }

    render(options) {
        let { force = this.tempOwnership } = options || {};
        if (force && (!this.document.testUserPermission(game.user, "OBSERVER") || (this.document.parent && !this.document.parent.testUserPermission(game.user, "OBSERVER")))) {
            this.document.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
            if (this.document.parent)
                this.document.parent.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
            this.tempOwnership = true;
        }
        if (this.enhancedjournal)
            this.enhancedjournal.render(options);
        else {
            super.render(options);
        }
    }

    /*
    async _render(force, options = {}) {
        //Foundry is going to try and reposition the window, but since it's a subsheet, we don't want that to happen
        //So fake it by telling it that the window is minimized
        let oldMinimize = this._minimized;
        if (this.enhancedjournal)
            this._minimized = true;

        if (!this._searchFilters)
            this._searchFilters = [];

        await super._render(force, Object.assign({ enhancedjournal: true }, options));

        if (setting('background-image') != 'none') {
            $(this.trueElement).attr("background-image", setting('background-image'));
        } else {
            $(this.trueElement).removeAttr("background-image");
        }

        if (setting('sidebar-image') != 'none') {
            $(this.trueElement).attr("sidebar-image", setting('sidebar-image'));
        } else {
            $(this.trueElement).removeAttr("sidebar-image");
        }

        if (this.enhancedjournal)
            this._minimized = oldMinimize;
        else if (!this.document.isOwner && ["base", "journalentry"].includes(this.type) && (this.options.sheetMode || this._sheetMode) === "image" && this.document.img) {
            $(this.trueElement).removeClass('monks-journal-sheet monks-enhanced-journal dnd5e');
        }

        if (!this.enhancedjournal && !this._backgroundsound?.playing) {
            // check to see if this object has a sound, and that sound sets an autoplay.
            let sound = this.document.getFlag("monks-enhanced-journal", "sound");
            if (sound?.audiofile && sound?.autoplay) {
                this._playSound(sound).then((sound) => {
                    this._backgroundsound = sound;
                });
            }

            this._soundHook = Hooks.on(game.modules.get("monks-sound-enhancements")?.active ? "globalSoundEffectVolumeChanged" : "globalInterfaceVolumeChanged", (volume) => {
                this._backgroundsound.volume = volume * getVolume();
            });
        }

        if (options?.anchor) {
            const anchor = $(`#${options?.anchor}`, this.trueElement);
            if (anchor.length) {
                anchor[0].scrollIntoView();
            }
        }

        if (game.modules.get("polyglot")?.active) {
            this.renderPolyglot(this.trueElement);
        }

        this.constructor.updateStyle.call(this);
    }*/

    static #onAction(eventType, event) {
        event.preventDefault();
        event.stopPropagation();

        const target = event.target.closest(`[data-${eventType}-action]`);
        const action = target.dataset[`${eventType}Action`];

        let handler = this.options.actions[action];
        handler?.call(this, event, target);
    }

    _canDragStart(selector) {
        return game.user.isGM;
    }

    _canDragSheetIconStart(selector) {
        return game.user.isGM;
    }

    _canDragDrop(selector) {
        return game.user.isGM;
    }

    async _onDragSheetIconStart(event) {
        const target = event.currentTarget;

        if ($(target).hasClass("sheet-icon")) {
            const dragData = {
                uuid: this.document.uuid,
                type: this.document.documentName,
                QEBypass: true
            };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        } else if (target.dataset.document == "Actor") {
            const dragData = {
                uuid: target.dataset.uuid,
                type: target.dataset.document
            };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        }
    }

    async _onDrop(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Actor') {
            this.addActor(data);
        } else if ((data.type == 'JournalEntry' || data.type == 'JournalEntryPage' || data.type == 'Actor') && this.enhancedjournal) {
            let document = await fromUuid(data.uuid);
            this.enhancedjournal.open(document);
        } else if (data.type == 'Item') {
            this.addItems(data);
        } else
            return false;
    }

    async _onDropLinkedActor(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Actor') {
            this.addActor(data);
        }
    }

    async _onDropRelationship(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'JournalEntry') {
            this.addRelationship(data);
        } else if (data.type == 'JournalEntryPage') {
            let doc = await fromUuid(data.uuid);
            data.id = doc?.parent.id;
            data.uuid = doc?.parent.uuid;
            data.type = "JournalEntry";
            this.addRelationship(data);
        }
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        if (!this.enhancedjournal) {
            $(this.trueElement)
                .attr('entity-type', this.document.type)
                .attr('entity-id', this.document.id)
                .attr('entity-uuid', this.document.uuid)
                .removeClass('dnd5e2 dnd5e2-journal');

            if (setting('background-image') != 'none') {
                $(this.trueElement).attr("background-image", setting('background-image'));
            } else {
                $(this.trueElement).removeAttr("background-image");
            }

            if (setting('sidebar-image') != 'none') {
                $(this.trueElement).attr("sidebar-image", setting('sidebar-image'));
            } else {
                $(this.trueElement).removeAttr("sidebar-image");
            }

            if (!this._backgroundsound?.playing) {
                // check to see if this object has a sound, and that sound sets an autoplay.
                let sound = this.document.getFlag("monks-enhanced-journal", "sound");
                if (sound?.audiofile && sound?.autoplay) {
                    this._playSound(sound).then((sound) => {
                        this._backgroundsound = sound;
                    });
                }

                this._soundHook = Hooks.on(game.modules.get("monks-sound-enhancements")?.active ? "globalSoundEffectVolumeChanged" : "globalInterfaceVolumeChanged", (volume) => {
                    this._backgroundsound.volume = volume * getVolume();
                });
            }

            this.constructor.updateStyle.call(this);
        }

        await this.activateListeners(this.trueElement);
        await this.subRender(context, options);
    }

    async subRender(context, options) {
        // Allow the notes to be editable by players even if they can't edit the journal entry
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (hasGM) {
            $('.tab.notes .editor-edit', this.trueElement).removeAttr('disabled');
            let editor = $(".notes-container prose-mirror.editor").on("open", (ev) => {
                editor.get(0).disabled = false;
            });
        }
    }

    async activateListeners(html) {
        $("[data-blur-action]", html).on('blur', EnhancedJournalSheet.#onAction.bind(this, 'blur'));
        $("[data-keypress-action]", html).on('keypress', EnhancedJournalSheet.#onAction.bind(this, 'keypress'));
        $("[data-change-action],[data-change-action] > input[type='text']", html).on('change', EnhancedJournalSheet.#onAction.bind(this, 'change'));
        $("[data-click-action]", html).on('click', EnhancedJournalSheet.#onAction.bind(this, 'click'));
        $("[data-dblclick-action]", html).on('dblclick', EnhancedJournalSheet.#onAction.bind(this, 'dblclick'));
        $("[data-contextmenu-action]", html).on('contextmenu', EnhancedJournalSheet.#onAction.bind(this, 'contextmenu'));

        $(".actor-img img", html).on("dragstart", foundry.applications.ux.TextEditor.implementation._onDragContentLink);

        this._dragDrop(html);
        this._contextMenu(html);

        $("a.picture-link", html).click(MonksEnhancedJournal._onClickPictureLink.bind(this));
        $("img:not(.nopopout)", html).click(this._onClickImage.bind(this));

        $('a[href^="#"]', html).click(this._onClickAnchor.bind(this));

        $('div.picture-outer', html)
            .on('keydown', this.checkScale.bind(this))
            .on('keyup', this.releaseScale.bind(this))
            .on("wheel", this.scaleImage.bind(this))
            .on("pointerdown", this.checkScale.bind(this))
            .on("pointermove", this.moveScale.bind(this))
            .on("pointerup", this.releaseScale.bind(this));
        
        $('.play-journal-sound', html).prop("disabled", false);
        $('header.collapsible', html).on("click", this.collapseItemSection.bind(this));

        $("div[data-tab='description'] prose-mirror.editor", html).on("save", (ev) => {

        });

        if (this.enhancedjournal) {
            /*
            if (enhancedjournal.subsheet.editors["text.content"]) {
                let oldSaveCallback = enhancedjournal.subsheet.editors["text.content"].options.save_onsavecallback;
                enhancedjournal.subsheet.editors["text.content"].options.save_onsavecallback = async (name) => {
                    await oldSaveCallback.call(enhancedjournal.subsheet.editors["text.content"], name);
                }
            }
            */

            /*
            if (game.system.id == "pf2e") {
                let cls = CONFIG.JournalEntry.sheetClasses.base["pf2e.JournalSheetPF2e"].cls;
                let object = this.document;
                if (object instanceof JournalEntryPage)
                    object = object.parent;
                let sheet = new cls(object);
                this.pf2eActivateEditor = sheet.activateEditor;
                sheet.activateEditor = this.activateEditor.bind(this);
                sheet.activateListeners.call(this, html);
            }*/
        }
    }

    activateEditor(name, options = {}, initialContent = "") {
        $('.editor .editor-display', this.trueElement).unmark();

        if (this.editors[name] != undefined) {
            if (game.modules.get("polyglot")?.active && game.polyglot) {
                game.polyglot.activeEditorLogic(options);
            }

            MonksEnhancedJournal.fixType(this.document);
            if (this.document.type == 'text' || this.document.type == 'journalentry' || this.document.type == 'oldentry' || setting("show-menubar")) {
                options = foundry.utils.mergeObject(options, { menubar: true });
            }
            if (this.pf2eActivateEditor)
                this.pf2eActivateEditor.call(this, name, options, initialContent);
            else
                super.activateEditor(name, options, initialContent);
            //need this because foundry doesn't allow access to the init of the editor
            //if (this.document.type == 'text' || this.document.type == 'journalentry' || this.document.type == 'oldentry' || setting("show-menubar")) {
                let count = 0;
                let that = this;
            let data = this.document.getFlag('monks-enhanced-journal', 'style');
                //if (data) {
                    let timer = window.setInterval(function () {
                        count++;
                        if (count > 20) {
                            window.clearInterval(timer);
                        }
                        let editor = that.editors[name];
                        if (editor && editor.mce) {
                            editor.mce.enhancedsheet = that;
                            that.constructor.updateStyle.call(that, data, $(editor.mce.contentDocument));
                            window.clearInterval(timer);
                        }
                    }, 100);
                //}
            //}
        }
    }

    _onClickImage(event) {
        const target = event.currentTarget;
        const title = this.document?.name ?? target.title;
        const ip = new foundry.applications.apps.ImagePopout({ src: target.src, window: { title } });
        //ip.shareImage = () => foundry.documents.collections.Journal.showDialog(this.document, { showAs: "image" });
        ip.render(true);
    }

    _dragDrop(html) {
        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".sheet-icon",
            dropSelector: "#board",
            permissions: {
                dragstart: this._canDragSheetIconStart.bind(this)
            },
            callbacks: {
                dragstart: this._onDragSheetIconStart.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".relationships .items-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropRelationship.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".offering-list .items-list",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropOffering.bind(this)
            }
        }).bind(html);

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".journal-sheet-header",
            permissions: {
                drop: () => game.user.isGM || this.document.isOwner
            },
            callbacks: {
                drop: this._onDropLinkedActor.bind(this)
            }
        }).bind(html);
    }

    _contextMenu(html) {
        new foundry.applications.ux.ContextMenu(html, ".editor-parent", this._getDescriptionContextOptions(), { fixed: true, jQuery: false });

        this.pictureContext = new foundry.applications.ux.ContextMenu(html, 'img[data-edit],div.picture-img', this._getImageContextOptions(), { eventName: "manual", fixed: true, jQuery: false, });

        new foundry.applications.ux.ContextMenu(html, ".actor-img-container", this._getPersonActorContextOptions(), { fixed: true, jQuery: false });
    }

    async getRelationships() {
        let relationships = this.document.flags['monks-enhanced-journal']?.relationships || {};

        if (relationships instanceof Array) {
            let newRelationships = {};
            for (let relationship of relationships) {
                newRelationships[relationship.id] = relationship;
            }

            relationships = newRelationships;
            await this.document.setFlag("monks-enhanced-journal", "relationships", relationships);
        }

        let results = {};
        for (let [relationshipId, relationship] of Object.entries(relationships)) {
            let entity = relationship.uuid ? await fromUuid(relationship.uuid) : game.journal.get(relationshipId);
            if (!(entity instanceof JournalEntry || entity instanceof JournalEntryPage))
                continue;
            if (entity && entity.testUserPermission(game.user, "LIMITED") && (game.user.isGM || !relationship.hidden)) {
                let page = (entity instanceof JournalEntryPage ? entity : entity.pages.contents[0]);
                MonksEnhancedJournal.fixType(page);
                let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
                if (!results[type])
                    results[type] = {
                        type: type,
                        name: type && (game.i18n.translations.MonksEnhancedJournal || game.i18n._fallback.MonksEnhancedJournal || {})?.sheettype[type?.toLowerCase()] ? i18n(`MonksEnhancedJournal.sheettype.${type?.toLowerCase()}`) : i18n("MonksEnhancedJournal.Unknown"),
                        documents: []
                    };

                if (results[type].documents.some(r => r.id == relationship.id && r.uuid == relationship.uuid))
                    continue;

                relationship.id = relationship.id || relationshipId;
                relationship.name = page.name;
                relationship.img = page.src || `modules/monks-enhanced-journal/assets/${type}.png`;
                relationship.type = type;
                relationship.shoptype = page.getFlag("monks-enhanced-journal", "shoptype");
                relationship.role = page.getFlag("monks-enhanced-journal", "role");

                results[type].documents.push(relationship);
            }
        }

        for (let [k, v] of Object.entries(results)) {
            v.documents = v.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        return results;
    }

    _getDescriptionContextOptions() {
        let menu = [
            {
                name: "Show in Chat",
                icon: '<i class="fas fa-comment"></i>',
                condition: game.user.isGM,
                callback: () => {
                    this.copyToChat();
                }
            },
            {
                name: "Extract to Journal Entry",
                icon: '<i class="fas fa-file-export"></i>',
                condition: game.user.isGM,
                callback: () => {
                    this.constructor.splitJournal.call(this);
                }
            }
        ];

        if (game.modules.get("narrator-tools")?.active) {
            menu = menu.concat(
                [{
                    icon: '<i class="fas fa-comment"></i>',
                    name: 'Describe',
                    condition: game.user.isGM,
                    callback: () => {
                        const selection = NarratorTools._getSelectionText();
                        if (selection)
                            NarratorTools.chatMessage.describe(selection);
                    },
                },
                {
                    icon: '<i class="fas fa-comment-dots"></i>',
                    name: 'Narrate',
                    condition: game.user.isGM,
                    callback: () => {
                        const selection = NarratorTools._getSelectionText();
                        if (selection)
                            NarratorTools.chatMessage.narrate(selection);
                    },
                }]
            );
        }

        return menu;
    }

    _getImageContextOptions() {
        let that = this;
        return [
            {
                name: "Show Image",
                icon: '<i class="fas fa-image"></i>',
                callback: () => {
                    const ip = new foundry.applications.apps.ImagePopout({
                        src: this.document.src,
                        uuid: this.document.uuid,
                        window: {
                            title: this.document.name
                        },
                        caption: this.document.image?.caption
                    });
                    ip.shareImage = () => foundry.documents.collections.Journal.showDialog(this.document, { showAs: "image" });
                    ip.render(true);
                }
            },
            {
                name: "Edit Image",
                icon: '<i class="fas fa-pencil"></i>',
                condition: this.document.isOwner,
                callback: () => {
                    that._onEditImage.call(that);
                }
            },
            {
                name: "Clear Image",
                icon: '<i class="fas fa-trash"></i>',
                condition: this.document.isOwner,
                callback: () => {
                    foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: `Clear Item`,
                        },
                        content: "Are you sure you want to clear the image?",
                        yes: {
                            callback: async () => {
                                await that.document.update({ src: "" });
                                if (this.constructor.type == "picture") {
                                    $('img[data-edit="src"],div.picture-img', this.trueElement).css({ opacity: 0 }).attr('src', "").css({ backgroundImage: "" });
                                    $('.sheet-body .instruction, .tab.picture .instruction', this.trueElement).show();
                                } else {
                                    let defaultImage = this.constructor.type == "picture" ? "" : `modules/monks-enhanced-journal/assets/${this.constructor.type}.png`;
                                    $('img[data-edit="src"],div.picture-img', this.trueElement).attr('src', defaultImage).css({ backgroundImage: defaultImage });
                                }
                            }
                        }
                    });
                }
            }
        ]
    }

    _getPersonActorContextOptions() {
        return [
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: () => {
                    foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: `${game.i18n.localize("SIDEBAR.Delete")} ${i18n("MonksEnhancedJournal.ActorLink")}`,
                        },
                        content: i18n("MonksEnhancedJournal.ConfirmRemoveLink"),
                        yes: { callback: this.removeActor.bind(this) }
                    });
                }
            },
            {
                name: i18n("MonksEnhancedJournal.ImportItems"),
                icon: '<i class="fas fa-download fa-fw"></i>',
                condition: () => game.user.isGM && this.document.type == "shop",
                callback: () => {
                    foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: i18n("MonksEnhancedJournal.ImportAllActorItems"),
                        },
                        content: i18n("MonksEnhancedJournal.msg.ConfirmImportAllItemsToShop"),
                        yes: { callback: this.importActorItems.bind(this) }
                    });
                }
            },
            {
                name: i18n("MonksEnhancedJournal.OpenActorSheet"),
                icon: '<i class="fas fa-user fa-fw"></i>',
                condition: () => game.user.isGM,
                callback: () => {
                    this.openActor.call(this, { newtab: true });
                }
            },
            {
                name: "Show Image",
                icon: '<i class="fas fa-image"></i>',
                callback: () => {
                    let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
                    let actor = game.actors.find(a => a.id == actorLink.id);
                    if (!actor)
                        return;

                    const ip = new foundry.applications.apps.ImagePopout({
                        src: actor.img,
                        uuid: actor.uuid,
                        window: {
                            title: actor.name
                        }
                    });
                    ip.shareImage = () => foundry.documents.collections.Journal.showDialog(actor, { showAs: "image" });
                    ip.render(true);
                }
            }
        ];
    }

    _disableFields(form) {
        super._disableFields(form);
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (hasGM) {
            $('.tab.notes .editor-edit', form).removeAttr('disabled');
            $(`textarea[name="flags.monks-enhanced-journal.${game.user.id}.notes"]`, form).removeAttr('disabled').removeAttr('readonly').on('blur', this._onChangeInput.bind(this));
        }
        //$('.editor-edit', form).css({ width: '0px !important', height: '0px !important' });
    }

    static getCurrency(actor, denomination) {
        let coinage;
        switch (game.system.id) {
            case 'pf2e':
                {
                    let coin = actor.items.find(i => { return i.isCoinage && i.system.price.value[denomination] == 1 });
                    coinage = (coin && coin.system.quantity); //price.value[denomination]);
                }
                break;
            case 'dsa5':
                {
                    let coin = actor.items.find(i => { return i.type == "money" && i.name == denomination });
                    coinage = (coin && coin.system.quantity.value);
                }
                break;
            case 'wfrp4e':
                {
                    let currency = MonksEnhancedJournal.currencies.find(c => c.id == denomination);
                    let coin = actor.itemCategories.money.find(i => { return i.type == "money" && i.name == currency.name });
                    coinage = parseInt((coin && coin.system.quantity.value) || 0);
                } break;
            case 'mythras':
                {
                    let currency = MonksEnhancedJournal.currencies.find(c => c.id == denomination);
                    let coin = actor.items.find(i => { return i.type == "currency" && i.name == currency.name });
                    coinage = parseInt((coin && coin.system.quantity) || 0);
                } break;
            case 'cyphersystem':
                {
                    let currency = MonksEnhancedJournal.currencies.find(c => c.id == denomination);

                    let coins = actor.system.settings.equipment.currency;
                    let systemcoins = {
                        name6: i18n('CYPHERSYSTEM.Adamantine'),
                        name5: i18n('CYPHERSYSTEM.Mithral'),
                        name4: i18n('CYPHERSYSTEM.Platinum'),
                        name3: i18n('CYPHERSYSTEM.Gold'),
                        name2: i18n('CYPHERSYSTEM.Silver'),
                        name: (coins.numberCategories == '1' ? i18n('CYPHERSYSTEM.Shins') : i18n('CYPHERSYSTEM.Copper'))
                    };

                    let coinname = Object.keys(coins).find(key => coins[key] == currency.name) || Object.keys(systemcoins).find(key => systemcoins[key] == currency.name);
                    if (!coinname)
                        return 0;

                    let qtyname = coinname.replace("name", "quantity");

                    coinage = parseInt(coins[qtyname] || 0);
                } break;
            case 'age-system':
                coinage = parseInt(actor.system[denomination]);
                break;
            case 'swade':
                coinage = parseInt(actor.system.details.currency);
                break;
            case 'swade':
                coinage = parseInt(actor.system.details.currency);
                break;
            case 'shadowrun5e':
                coinage = parseInt(actor.system.nuyen);
                break;
            case 'starwarsffg':
                coinage = parseInt(actor.system.stats.credits.value);
                break;
            case 'sfrpg':
                coinage = parseInt(actor.system.currency[(denomination == "cr" ? "credit" : denomination)]);
                break;
            case 'pirateborg':
                coinage = parseInt(actor.system[denomination]);
                break;
            case 'demonlord':
                coinage = parseInt(actor.system.wealth[denomination]);
                break;
            default:
                {
                    let coin = currencyname() == "" ? actor : getValue(actor, currencyname()) ?? actor;
                    coinage = parseInt(getValue(coin, denomination));
                }
                break;
        }

        return parseInt(coinage ?? 0);
    }

    getCurrency(actor, denomination) {
        return this.constructor.getCurrency(actor, denomination);
    }

    static async addCurrency(actor, denomination, value) {
        let changes = {};
        if (value < 0 && setting("purchase-conversion")) {
            let currencies = foundry.utils.duplicate(MonksEnhancedJournal.currencies || []).filter(c => c.convert != undefined);
            for (let curr of currencies) {
                curr.value = parseInt(this.getCurrency(actor, curr.id) || 0);
            }

            changes = currencies.reduce((a, v) => ({ ...a, [v.id]: v.value }), {});
            let denomIdx = currencies.findIndex(c => c.id == denomination);
            if (denomIdx == -1)
                return;

            let remainder = -value;
            // pull from the actual currency first
            let available = Math.floor(Math.min(remainder, changes[denomination]));
            if (available > 0) {
                remainder -= available;
                changes[denomination] -= available;
            }

            let idx = denomIdx + 1;
            let dir = 1;
            // move to lower denominations, then work through the higher denomination
            while (remainder > 0 && idx >= 0) {
                if (idx >= currencies.length) {
                    idx = denomIdx - 1;
                    dir = -1;
                }

                //check to make sure the currency in question has some available
                if (idx >= 0 && currencies[idx].value > 0) {
                    let rate = (currencies[idx].convert || 1) / (currencies[denomIdx].convert || 1);
                    available = Math.floor(currencies[idx].value * rate); // convert from lower denomination to currenct denomination

                    if (available > 0) {
                        let used = Math.floor(Math.min(remainder, available));

                        remainder -= used;
                        
                        let unused = available - used;
                        changes[currencies[idx].id] = Math.floor(unused / rate);
                        unused -= Math.floor(unused / rate) * rate;

                        if (idx < denomIdx && unused > 0) {
                            // If this is a greater denomination, then we need to disperse the unused between the lower denominations
                            let jdx = idx + 1;
                            while (unused > 0 && jdx < currencies.length) {
                                let r = (currencies[jdx].convert || 1) / (currencies[denomIdx].convert || 1);
                                let disperse = unused / r;
                                changes[currencies[jdx].id] += Math.floor(disperse);
                                unused -= Math.floor(disperse) * r;

                                jdx++;
                            }
                        }
                    }
                }

                idx += dir;
            }

            //changes[denomination] += value;

            for (let curr of Object.keys(changes)) {
                let orig = currencies.find(c => c.id == curr);
                if (changes[curr] == orig.value)
                    delete changes[curr];
            }
        } else
            changes[denomination] = parseInt(this.getCurrency(actor, denomination) || 0) + value;

        let updates = {};
        if (game.system.id == 'pf2e') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let coinage = actor.items.find(i => { return i.isCoinage && i.system.price.value[k] == 1 });
                if (!coinage) {
                    let itemData = MonksEnhancedJournal.pf2eCurrency[k];
                    foundry.utils.setProperty(itemData, "system.quantity", v);
                    let items = await actor.createEmbeddedDocuments("Item", [itemData]);
                    if (items.length)
                        coinage = items[0];
                } else {
                    updates[`system.quantity`] = v;
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else if (game.system.id == 'mythras') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let currency = MonksEnhancedJournal.currencies.find(c => c.id == k);
                let coinage = actor.items.find(i => { return i.type == "currency" && i.name == currency });
                if (coinage) {
                    updates[`system.quantity`] = v;
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else if (game.system.id == 'dsa5') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let coinage = actor.items.find(i => { return i.type == "money" && i.name == k });
                if (coinage) {
                    updates[`system.quantity`] = { value: v };
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else if (game.system.id == 'wfrp4e') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let currency = MonksEnhancedJournal.currencies.find(c => c.id == k);
                let coinage = actor.itemCategories.money.find(i => { return i.type == "money" && i.name == currency.name });
                if (!coinage) {
                    let itemData = MonksEnhancedJournal.wfrp4eCurrency[k];
                    foundry.utils.setProperty(itemData, "system.quantity.value", v);
                    let items = await actor.createEmbeddedDocuments("Item", [itemData]);
                    if (items.length)
                        coinage = items[0];
                } else {
                    updates[`system.quantity.value`] = v;
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else {
            for (let [k, v] of Object.entries(changes)) {
                switch (game.system.id) {
                    case 'age-system':
                        updates[`system.${k}`] = v;
                        break;
                    case 'swade':
                        updates[`system.details.currency`] = v;
                        break;
                    case 'sfrpg':
                        updates[`system.currency.${k == "cr" ? "credit" : k}`] = v;
                        break;
                    case 'shadowrun5e':
                        updates[`system.nuyen`] = v;
                        break;
                    case 'starwarsffg':
                        updates[`system.stats.credits.value`] = v;
                        break;
                    case 'cyphersystem':
                        {
                            let currency = MonksEnhancedJournal.currencies.find(c => c.id == k);

                            let coins = actor.system.settings.equipment.currency;
                            let systemcoins = {
                                name6: i18n('CYPHERSYSTEM.Adamantine'),
                                name5: i18n('CYPHERSYSTEM.Mithral'),
                                name4: i18n('CYPHERSYSTEM.Platinum'),
                                name3: i18n('CYPHERSYSTEM.Gold'),
                                name2: i18n('CYPHERSYSTEM.Silver'),
                                name: (coins.numberCategories == '1' ? i18n('CYPHERSYSTEM.Shins') : i18n('CYPHERSYSTEM.Copper'))
                            };

                            let coinname = Object.keys(coins).find(key => coins[key] == currency.name) || Object.keys(systemcoins).find(key => systemcoins[key] == currency.name);

                            if (!coinname)
                                continue;
                            let qtyname = coinname.replace("name", "quantity");

                            updates[`system.settings.equipment.currency.${qtyname}`] = v;
                        } break;
                    case 'pirateborg':
                        updates[`system.${k}`] = v;
                        break;
                    case 'demonlord':
                        updates[`system.wealth.${k}`] = v;
                        break;
                    default:
                        {
                            let coin = currencyname() == "" ? actor : getValue(actor, currencyname()) ?? actor;
                            updates[`system${currencyname() != "" ? "." : ""}${currencyname()}.${k}`] = (coin[k] && coin[k].hasOwnProperty("value") ? { value: v } : v);
                        }
                        break;
                }
            }
            return actor.update(updates);
        }
    }

    addCurrency(actor, denomination, value) {
        return this.constructor.addCurrency(actor, denomination, value);
    }

    static onAddSound(event, target) {
        let sound = (this.enhancedjournal ? this.enhancedjournal._backgroundsound[this.document.id] : this._backgroundsound);
        new EditSound({ document: this.document, sound, journalsheet: this }).render(true);
    }

    loadSound(src, autoplay, autoplayOptions) {
        let sound = new foundry.audio.Sound(src);
        sound.load({ autoplay, autoplayOptions });

        if (this.enhancedjournal)
            this.enhancedjournal._backgroundsound[this.document.id] = sound;
        else
            this._backgroundsound = sound;
    }

    clearSound() {
        if (this.enhancedjournal)
            this.enhancedjournal._backgroundsound[this.document.id] = null;
        else
            this._backgroundsound = null;
    }

    static toggleSound() {
        let sound = (this.enhancedjournal ? this.enhancedjournal._backgroundsound[this.document.id] : this._backgroundsound);

        if (sound?.playing) {
            // stop sound playing
            this._stopSound(sound);
        } else {
            // start sound playing
            let soundData = this.document.getFlag("monks-enhanced-journal", "sound");
            if (!sound || sound.src != soundData.audiofile) {
                sound = this.document.getFlag("monks-enhanced-journal", "sound");
            }
            this._playSound(sound).then((sound) => {
                if (!sound)
                    return;

                if (this.enhancedjournal)
                    this.enhancedjournal._backgroundsound[this.document.id] = sound;
                else
                    this._backgroundsound = sound;
            });
        }
    }

    _playSound(sound) {
        if (sound.audiofile) {
            let volume = sound.volume ?? 1;
            $('.play-journal-sound', (this.enhancedjournal ? this.enhancedjournal.element : this.trueElement)).addClass("loading").find("i").attr("class", "fas fa-sync fa-spin");
            return foundry.audio.AudioHelper.play({
                src: sound.audiofile,
                loop: sound.loop,
                volume: 0
            }).then((soundfile) => {
                if (game.modules.get("monks-sound-enhancements")?.active) {
                    game.MonksSoundEnhancements.addSoundEffect(soundfile, this.document.name);
                }
                $('.play-journal-sound', (this.enhancedjournal ? this.enhancedjournal.element : this.trueElement)).addClass("active").removeClass("loading").find("i").attr("class", "fas fa-volume-up");
                soundfile.fade(volume * getVolume(), { duration: 500 });
                soundfile.addEventListener("end", () => {
                    $('.play-journal-sound', (this.enhancedjournal ? this.enhancedjournal.element : this.trueElement)).removeClass("active").find("i").attr("class", "fas fa-volume-off");
                });
                soundfile.addEventListener("stop", () => {
                    $('.play-journal-sound', (this.enhancedjournal ? this.enhancedjournal.element : this.trueElement)).removeClass("active").find("i").attr("class", "fas fa-volume-off");
                });
                soundfile.effectiveVolume = volume;
                return soundfile;
            });
        } else {
            let soundData = this.document.getFlag("monks-enhanced-journal", "sound");
            let options = { volume: (soundData.volume ?? 1), fade: 500, loop: soundData.loop };
            if (!sound.loaded)
                sound.load({ autoplay: true, autoplayOptions: options });
            else
                sound.play(options);
            if (game.modules.get("monks-sound-enhancements")?.active) {
                game.MonksSoundEnhancements.addSoundEffect(sound, this.document.name);
            }
            $('.play-journal-sound', (this.enhancedjournal ? this.enhancedjournal.element : this.trueElement)).addClass("active").find("i").attr("class", "fas fa-volume-up");
        }

        return new Promise((resolve) => { });
    }

    _stopSound(sound) {
        if (sound && sound.stop) {
            $('.play-journal-sound i', (this.enhancedjournal ? this.enhancedjournal.element : this.trueElement)).attr("class", "fas fa-volume-off");
            sound.fade(0, { duration: 500 }).then(() => {
                sound.stop();
            });
        }
    }

    _onClickAnchor(event) {
        event.preventDefault();
        event.stopPropagation();
        const a = $(event.currentTarget);

        const href = a.attr("href");

        const anchor = $(href);
        if (anchor.length) {
            anchor[0].scrollIntoView();
        }
    }

    static async onAddImage(event, target) {
        if (this.document.isOwner) {
            if (!this.document.src) {
                this._onEditImage.call(this, event);
            } else if(event.shiftKey) {
                await this.document.update({ src: "" });
                let defaultImage = this.constructor.type == "picture" ? "" : `modules/monks-enhanced-journal/assets/${this.constructor.type}.png`;
                $('img[data-edit="src"],div.picture-img', this.trueElement).attr('src', defaultImage).css({ backgroundImage: defaultImage });
            }
        }
    }

    static onImageDblClick(event, target) {
        if (this.document.isOwner && !this.document.src)
            this._onEditImage.call(this, event);
        else
            this._onShowImage.call(this, event);
    }

    static onImageContext(event, target) {
        if (this.document.isOwner && this.document.src) {
            this.pictureContext._onActivate(event);
        } else {
            if (!this.document.src) {
                this._onEditImage.call(this, event);
            } else {
                this._onShowImage.call(this, event);
            }
        }
    }

    _onShowImage(event) {
        const ip = new foundry.applications.apps.ImagePopout({
            src: this.document.src,
            uuid: this.document.uuid,
            window: {
                title: this.document.name
            },
            caption: this.document.image?.caption
        });
        ip.shareImage = () => foundry.documents.collections.Journal.showDialog(this.document, { showAs: "image" });
        ip.render(true);
    }

    _onEditImage(event) {
        event?.preventDefault();
        event?.stopPropagation();
        event?.stopImmediatePropagation();

        if (this.document.permission < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
            return null;

        if (event?.shiftKey) {
            $(event?.currentTarget).attr('src', "").css({ backgroundImage: `` });
            $('img[data-edit="src"]', this.trueElement).css({ opacity: '' });
            $('.tab.picture .instruction', this.trueElement).show();
            $('.sheet-body .instruction', this.trueElement).show();
            this.submit(); // constructor.onSubmit.call(this, event, { preventClose: true });
        } else if (!event?.ctrlKey && !event?.metaKey) {
            const fp = new foundry.applications.apps.FilePicker.implementation({
                type: "image",
                current: this.document.img,
                callback: async (path) => {
                    //$(event?.currentTarget).attr('src', path).css({ backgroundImage: `url(${path})` });
                    $('img[data-edit="src"],div.picture-img', this.trueElement).css({ opacity: '' }).attr('src', path).css({ backgroundImage: `url(${path})` });
                    $('.tab.picture .instruction', this.trueElement).hide();
                    $('.sheet-body .instruction', this.trueElement).hide();
                    let result = this.submit(); // constructor.onSubmit.call(this, event, { preventClose: true });
                    if (result instanceof Promise)
                        await result;
                    //this.render(true);
                },
                top: this.position.top + 40,
                left: this.position.left + 10
            })
            return fp.browse();
        }
    }

    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = super._prepareSubmitData(event, form, formData, updateData);

        // Make sure to include all the relationship data if you're updating data
        let relationships = foundry.utils.mergeObject(foundry.utils.getProperty(submitData, "flags.monks-enhanced-journal.relationships") || {}, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.relationships") || {}, {overwrite: false});
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.relationships", relationships);

        // Make sure to include all the item data if you're updating data
        let items = foundry.utils.mergeObject(foundry.utils.getProperty(submitData, "flags.monks-enhanced-journal.items") || {}, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.items") || {}, { overwrite: false });
        foundry.utils.setProperty(submitData, "flags.monks-enhanced-journal.items", items);

        //Fix an issue with Foundry core not retrieving all the form inputs
        for (let el of form.elements) {
            if (!el.name || el.disabled || (el.tagName === "BUTTON")) continue;
            const field = form.elements[el.name];

            // Duplicate Fields
            if (field instanceof RadioNodeList) {
                const values = [];
                for (let f of field) {
                    if (f.type === "checkbox")
                        values.push(f.checked);
                }
                if (values.length)
                    submitData[el.name] = values;
            }
        }

        return submitData;
    }

    static onSubmit(event, form, formData) {
        let submitData = this._prepareSubmitData(event, form, formData, {})

        if (Object.keys(submitData).length == 0)
            return;

        if (this.type == 'quest') {
            $(`li[data-entry-id="${this.document.id}"]`, '#journal,#journal-directory').attr('status', submitData.flags['monks-enhanced-journal'].status);
        }

        if (submitData.src?.startsWith("modules/monks-enhanced-journal/assets/"))
            submitData.src = null;

        if (submitData.src != undefined) {
            this.document.parent.setFlag('monks-enhanced-journal', 'img', submitData.src);
        }

        if (!this.isEditable && foundry.utils.getProperty(submitData, 'flags.monks-enhanced-journal.' + game.user.id)) {
            //need to have the GM update this, but only the user notes
            MonksEnhancedJournal.emit("saveUserData", {
                documentId: this.document.uuid,
                userId: game.user.id,
                userdata: foundry.utils.getProperty(submitData, `flags.monks-enhanced-journal.${game.user.id}`)
            });
            return true;//new Promise(() => { });
        } else if (this.isEditable) {
            // Removed this because Foundry was giving a == error and I think the Hook in monks-enhanced-journal was covering it submitData.type = "text";
            return this.document.update(submitData);
        }
    }

    _documentControls() {
        let ctrls = [];
        if (!this.enhancedjournal && this.isEditable) {
            ctrls.push({
                icon: "fa-solid fa-gear",
                label: "SHEETS.ConfigureSheet",
                action: "configureSheet",
                visible: true
            });
        }
        if (this.document.id)
            ctrls.push({ id: 'locate', label: i18n("SIDEBAR.JumpPin"), icon: 'fas fa-crosshairs', visible: game.user.isGM, attr: { "page-id": this.document.id, "journal-id": this.document.parent?.id }, action: "findMapEntry" });
        let defaultSettings = (game.settings.settings.get("monks-enhanced-journal.sheet-settings")?.default || {})[this.constructor.type];
        if (defaultSettings != undefined && Object.keys(defaultSettings).length > 0)
            ctrls.push({ id: 'settings', label: i18n("MonksEnhancedJournal.EditFields"), icon: 'fas fa-cog', visible: game.user.isGM, action: "editFields" });
        return ctrls;
    }

    open(document, event) {
        if (document) {
            if (this.enhancedjournal)
                this.enhancedjournal.open(document, (event?.shiftKey || event?.newtab));
            else {
                let page = document;
                if (document instanceof JournalEntry && document.pages.size == 1) {
                    page = document.pages.contents[0];
                }

                if (page instanceof JournalEntryPage) {
                    MonksEnhancedJournal.fixType(page);
                    let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (types[type]) {
                        return page.sheet.render(true);
                    }
                }

                document.sheet.render(true);
            }
        }
    }

    static updateStyle(data, element) {
        if (data == undefined)
            data = foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.style");

        if (data == undefined)
            return;

        let content = $(element).hasClass("editor-parent") ? $(element) : $('.editor-parent', (element || this.trueElement));

        let img = data.img?.value || data.img;

        let css = {
            'background-color': (data.color ? data.color : ''),
            'background-image': (img ? 'url(' + img + ')' : ''),
            'background-repeat': (data.sizing == 'repeat' ? 'repeat' : 'no-repeat'),
            'background-position': 'center',
            'background-size': (data.sizing == 'repeat' ? 'auto' : (data.sizing == 'stretch' ? '100% 100%' : data.sizing))
        }

        content.css(css);
    }

    static onEditDescription(event, target) {
        if (!this.isEditable)
            return null;

        let navElement = $(".sheet-tabs.tabs", this.trueElement).get(0);
        if (this.tabGroups["primary"])
            this.changeTab.call(this.enhancedjournal || this, "description", "primary", { event, navElement });
        let editing = $(".editor-parent[data-editor-id='description']", this.trueElement).hasClass("editing");
        $(".editor-parent[data-editor-id='description']", this.trueElement).toggleClass("editing", !editing);
        $(".nav-button.edit i", this.enhancedjournal?.element || this.element).toggleClass("fa-pencil-alt", editing).toggleClass("fa-save", !editing);
    }

    static onEditNotes(event, target) {
        let editing = $(".editor-parent[data-editor-id='notes']", this.trueElement).hasClass("editing");
        $(".editor-parent[data-editor-id='notes']", this.trueElement).toggleClass("editing", !editing);
    }

    static findMapEntry(event, target) {
        canvas.notes.panToNote(this.document.sceneNote);
    }

    static onEditFields() {
        //popup a dialog with the available fields to edit
        new CustomisePage({ document: this.document, journalsheet: this }).render(true);
    }

    async renderPolyglot(html) {

        //show the runes if [(gm or owner) and userunes][not gm and lang unknown]

        let that = this;
        //userunes = !(this.document.getFlag('monks-enhanced-journal', 'use-runes') != undefined ? this.document.getFlag('monks-enhanced-journal', 'use-runes') : setting('use-runes'));
        //MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'use-runes', userunes);
        //$('.nav-button.polyglot i', this.trueElement).attr('class', 'fas ' + (userunes ? 'fa-link' : 'fa-unlink'));


        $('.editor-display span.polyglot-journal:not(.converted)', html).each(function () {
            const lang = this.dataset.language;
            if (!lang) return;

            let text = $(this).html();
            let polyglot = (foundry.utils.isNewerVersion(game.modules.get("polyglot")?.version, "1.7.30") ? game.polyglot : polyglot?.polyglot);
            if (!polyglot)
                return;

            let scramble = polyglot.scrambleString(this.textContent, that.document.id, lang);
            let font = polyglot._getFontStyle(lang);
            let languages = polyglot.LanguageProvider?.languages || polyglot.languageProvider?.languages;

            $(this).addClass('converted')
                .attr('data-tooltip', (game.user.isGM || that.document.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER || polyglot.known_languages.has(lang) ? languages[lang]?.label : '????'))
                .attr('data-language', lang)
                .css({ font: font })
                .data({ text: text, scramble: scramble, lang: lang, font: font, changed: true })
                .html(scramble)
                .click(
                    function () {
                        let data = $(this).data();
                        const lang = data.lang;
                        if (game.user.isGM || that.document.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER || polyglot.known_languages.has(lang)) {
                            $(this).data('changed', !data.changed).html(data.changed ? data.scramble : data.text).css({ font: (data.changed ? data.font : '') });
                        }
                    }
                );
        });
    }

    slugify(str) {
        if (str == undefined)
            return "";

        str = str.replace(/^\s+|\s+$/g, '');

        // Make the string lowercase
        str = str.toLowerCase();

        // Remove accents, swap ñ for n, etc
        var from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆÍÌÎÏŇÑÓÖÒÔÕØŘŔŠŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšťúůüùûýÿžþÞĐđßÆa·/_,:;";
        var to = "AAAAAACCCDEEEEEEEEIIIINNOOOOOORRSTUUUUUYYZaaaaaacccdeeeeeeeeiiiinnooooooorrstuuuuuyyzbBDdBAa------";
        for (var i = 0, l = from.length; i < l; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }

        // Remove invalid chars
        str = str.replace(/[^a-z0-9 -]/g, '')
            // Collapse whitespace and replace by -
            .replace(/\s+/g, '-')
            // Collapse dashes
            .replace(/-+/g, '-');

        return str;
    }

    getItemList() {
        let items = this.document.getFlag("monks-enhanced-journal", "items");
        return items || {};
    }

    async getItemGroups(purchasing, sort = "name") {
        let items = this.document.getFlag("monks-enhanced-journal", "items");
        let type = foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.type");

        if (!items)
            return {};

        if (items instanceof Array) {
            let newItems = {};
            for (let item of items) {
                let id = item.id || item._id;
                if (!id)
                    continue;
                newItems[id] = item;
            }

            items = newItems;
            await this.document.setFlag("monks-enhanced-journal", "items", items);
        }
        
        let groups = {};
        for (let [key, item] of Object.entries(items)) {
            if (!key || !item)
                continue;
            if (!item.system && item.data)
                item = item.data;
            let requests = (Object.entries(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.requests") || {})).map(([k, v]) => {
                if (!v)
                    return null;
                let user = game.users.get(k);
                if (!user)
                    return null;
                return { id: user.id, border: user.border, color: user.color, letter: user.name[0], name: user.name };
            }).filter(r => !!r);

            let hasRequest = (requests.find(r => r.id == game.user.id) != undefined);

            let flags = foundry.utils.getProperty(item, "flags.monks-enhanced-journal") || {};
            let text = i18n("MonksEnhancedJournal.Unavailable");
            let icon = "";
            if (type == 'shop') {
                if (flags.quantity === 0) {
                    text = i18n("MonksEnhancedJournal.SoldOut");
                    icon = "";
                } else if (item.lock) {
                    text = i18n("MonksEnhancedJournal.Unavailable");
                    icon = "fa-lock";
                } else {
                    text = i18n("MonksEnhancedJournal.Purchase");
                    icon = "fa-dollar-sign";
                }
            } else {
                if (purchasing == "free") {
                    text = i18n("MonksEnhancedJournal.Take");
                    icon = "fa-hand-paper";
                } else if (hasRequest) {
                    text = i18n("MonksEnhancedJournal.Cancel");
                    icon = "";
                } else {
                    text = i18n("MonksEnhancedJournal.Request");
                    icon = "fa-hand-holding-medical";
                }
            }

            let qtyof = foundry.utils.getProperty(item, "system." + quantityname());

            let price = MEJHelpers.getPrice(flags.price);
            let cost = price;
            if (flags.cost != undefined)
                cost = MEJHelpers.getPrice(flags.cost);

            let name = item.name;
            let img = item.img;

            let identifiedName = name;
            if (item.system?.identification?.status == "unidentified") {
                name = item.system?.identification.unidentified.name || name;
                img = item.system?.identification.unidentified.img || img;
            } else if (item.system?.identified === false) {
                name = item.system?.unidentified?.name || name;
            }

            let itemData = {
                _id: key,
                name: name,
                identifiedname: game.user.isGM && identifiedName != name ? identifiedName : null,
                type: item.type,
                img: img,
                hidden: item.hidden,
                lock: item.lock,
                consumable: item.consumable,
                from: flags.from,
                quantity: flags.quantity,
                qtyof: qtyof,
                remaining: flags.remaining,
                price: (price.consume ? "-" : "") + price.value + " " + price.currency,
                cost: (cost.consume && (game.user.isGM || this.document.isOwner) ? "-" : "") + (cost.value + " " + cost.currency),
                text: text,
                icon: icon,
                assigned: flags.assigned,
                received: flags.received,
                requests: requests
            };

            if (game.system.id == "dnd5e" && item.system?.rarity) {
                itemData.rarity = item.system?.rarity;
            } else if (game.system.id == "pf2e" && item.system?.traits?.rarity) {
                itemData.rarity = i18n(CONFIG.PF2E.rarityTraits[item.system?.traits?.rarity]);
            }

            if (game.user.isGM || this.document.isOwner || (item.hide !== true && (flags.quantity !== 0 || setting('show-zero-quantity')))) {
                let groupId = (!sort || sort == "name" ? this.slugify(item.type) : "");
                if (groups[groupId] == undefined)
                    groups[groupId] = { id: groupId, name: item.type || "Unknown", items: [] };
                groups[groupId].items.push(itemData);
            }
        }

        let currencies = (MonksEnhancedJournal.currencies || []).reduce((a, v) => ({ ...a, [v.id]: v.convert }), {});
        let defCurr = MEJHelpers.defaultCurrency();
        sort = sort || "name";
        for (let [k, v] of Object.entries(groups)) {
            groups[k].items = groups[k].items.sort((a, b) => {
                let aVal = a[sort];
                let bVal = b[sort];
                let aName = a.name;
                let bName = b.name;

                if (sort == "price" || sort == "cost") {
                    let aCurr = MEJHelpers.getPrice(aVal);
                    let bCurr = MEJHelpers.getPrice(bVal);

                    aVal = aCurr.value * (currencies[aCurr.currency] || 1) / (currencies[defCurr] || 1);
                    bVal = bCurr.value * (currencies[bCurr.currency] || 1) / (currencies[defCurr] || 1);
                }

                let sortVal = (aVal < bVal ? -1 : (aVal > bVal ? 1 : 0));
                if (sortVal == 0) {
                    return (aName < bName ? -1 : (aName > bName ? 1 : 0));
                } else
                    return sortVal;
            });
        }

        /*
        groups = Object.values(groups).sort((a, b) => {
            if (a.name < b.name) return -1;
            return a.name > b.name ? 1 : 0;
        });
        */

        for (let group of Object.values(groups)) {
            group.collapsed = this.document._itemList[group.id];
        }

        return groups;
    }

    getOfferings() {
        let currencies = MonksEnhancedJournal.currencies;

        return (this.document.flags['monks-enhanced-journal']?.offerings || []).map(o => {
            if (o.hidden && !(game.user.isGM || this.document.isOwner || (o.userid == game.user.id && o.state != "cancelled")))
                return null;

            let actor = game.actors.get(o.actor?.id || o.actorId);
            if (!actor)
                return null;

            let items = [];
            for (let [k, v] of Object.entries(o.currency)) {
                if (v) {
                    let curr = currencies.find(c => c.id == k);
                    items.push({ img: "icons/svg/coins.svg", name: `${v} ${i18n(curr?.name) || "Unknown Currency"}`});
                }
            }
            items = items.concat(
                o.items.map(i => {
                    let itemActor = actor;
                    if (itemActor.id != i.actorId) {
                        itemActor = game.actors.get(i.actorId);
                    }

                    let item = {};
                    if (itemActor) {
                        item = itemActor.items.get(i.id);
                    }

                    return {
                        img: item?.img || i.img,
                        name: `${itemActor.id != actor.id ? (itemActor.name || i.actorName) + ", " : ''}${i.qty > 1 ? "&times;" + i.qty + " " : ""}${item?.name || i18n(i.itemName)}`
                    };
                })
            );
            return {
                id: o.id,
                name: actor?.name || o.actor?.name,
                img: actor?.img || o.actor?.img,
                actorId: actor?.id || o.actor?.id,
                items: items,
                hidden: o.hidden,
                owner: o.userid == game.user.id,
                state: o.state,
                done: o.state != "offering",
                stateName: i18n(`MonksEnhancedJournal.offer.${o.state}`),
                stateIcon: (o.state == "offering" ? "fa-hand-holding-medical" : (o.state == "accepted" ? "fa-check" : (o.state == "rejected" ? "fa-times" : "fa-undo"))),
            }
        }).filter(o => !!o);
    }

    static async getDocument(data, type, notify = true) {
        let document;
        if (data.data) {
            document = new CONFIG.Item.documentClass(data.data, {});
        } else if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            document = id ? await pack.getDocument(id) : null;
        } else {
            if (data.type || type) {
                let collection = game.collections.get(type || data.type);
                if (collection) {
                    document = collection.get(data.id);
                    if (document) {
                        if (document.documentName === "Scene" && document.journal)
                            document = document.journal;
                        if (notify && !document.testUserPermission(game.user, "LIMITED")) {
                            return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: document.documentName }));
                        }
                    }
                }
            }
        }

        if (!document && data.uuid)
            document = await fromUuid(data.uuid);

        return document;
    }

    async getDocument(...args) {
        return this.constructor.getDocument(...args);
    }

    static async createRequestMessage(entry, item, actor, isShop) {
        let data = foundry.utils.getProperty(item, "flags.monks-enhanced-journal");
        let price = isShop ? MEJHelpers.getPrice(data.cost) : null;
        data.sell = price?.value;
        data.currency = price?.currency;
        data.maxquantity = data.maxquantity ?? data.quantity;
        if (data.maxquantity)
            data.quantity = Math.max(Math.min(data.maxquantity, data.quantity), 1);
        data.total = (price ? data.quantity * data.sell : null);
        foundry.utils.setProperty(item, "flags.monks-enhanced-journal", data);

        let detail = MonksEnhancedJournal.getItemDetails(item);
        item.img = detail.img;
        item.name = detail.name;

        let messageContent = {
            action: 'buy',
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [item],
            shop: { uuid: entry.uuid, name: entry.name, img: entry.src || `modules/monks-enhanced-journal/assets/${entry.type}.png` }
        }

        //create a chat message
        let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        if (!whisper.find(u => u == game.user.id))
            whisper.push(game.user.id);
        let speaker = ChatMessage.getSpeaker();
        let content = await foundry.applications.handlebars.renderTemplate("./modules/monks-enhanced-journal/templates/request-item.html", messageContent);
        let messageData = {
            user: game.user.id,
            speaker: speaker,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
            content: content,
            flavor: (speaker.alias ? format("MonksEnhancedJournal.ActorWantsToPurchase", { alias: speaker.alias, verb: (price ? i18n("MonksEnhancedJournal.Purchase").toLowerCase() : i18n("MonksEnhancedJournal.Take").toLowerCase()) }): null),
            whisper: whisper,
            flags: {
                'monks-enhanced-journal': messageContent
            }
        };

        ChatMessage.create(messageData, {});
    }

    static async confirmQuantity(item, max, verb, showTotal = true, price) {
        if (!price)
            price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.cost") || foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));

        let maxquantity = max != "" ? parseInt(max) : null;
        if (maxquantity == 1 && !showTotal)
            return { quantity: 1, price: price };

        let details = MonksEnhancedJournal.getItemDetails(item);

        let quantity = 1;
        let data = {
            msg: format("MonksEnhancedJournal.HowManyWouldYouLike", { verb: verb }),
            img: details.img,
            name: details.name,
            quantity: quantity,
            price: price?.value + " " + price?.currency,
            maxquantity: maxquantity,
            total: (showTotal ? price?.value + " " + price?.currency : null),
            isGM: game.user.isGM
        };
        let content = await foundry.applications.handlebars.renderTemplate('/modules/monks-enhanced-journal/templates/confirm-purchase.html', data);
        let result = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: i18n("MonksEnhancedJournal.ConfirmQuantity"),
            },
            content: content,
            render: (evt, dialog) => {
                $('input[name="quantity"]', dialog.element).change((event) => {
                    quantity = parseInt($(event.currentTarget).val() || 1);
                    if (quantity < 1) {
                        quantity = 1;
                        $(event.currentTarget).val(quantity);
                    }
                    if (max) {
                        quantity = Math.max(Math.min(parseInt(max), quantity), 0);
                        $(event.currentTarget).val(quantity);
                    }
                    if (showTotal)
                        $('.request-total', dialog.element).html((quantity * price.value) + " " + price.currency);
                });
                $('input[name="price"]', dialog.element).change((event) => {
                    price = MEJHelpers.getPrice($(event.currentTarget).val());
                    $(event.currentTarget).val(price?.value + " " + price?.currency);
                    if (showTotal)
                        $('.request-total', dialog.element).html((quantity * price?.value) + " " + price?.currency);
                });
                $(".dialog-content", dialog.element).css({ 'gap': '0.2rem' });
            },
            yes: {
                callback: (event) => {
                    let form = event.target.form;
                    let new_quantity = parseInt($('input[name="quantity"]', form).val());
                    let new_price = (game.user.isGM ? MEJHelpers.getPrice($('input[name="price"]', form).val()) : price);
                    return { quantity: new_quantity, price: new_price };
                }
            }
        });

        return result;
    }

    static purchaseItem(entry, id, quantity = 1, { actor = null, user = null, remaining = false, purchased = false, chatmessage = true }) {
        let items = foundry.utils.duplicate(entry.getFlag('monks-enhanced-journal', 'items') || {});
        if (items) {
            let item = items[id];
            if (item) {
                if (remaining) {
                    foundry.utils.setProperty(item, "flags.monks-enhanced-journal.remaining", Math.max(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining") - quantity, 0));
                    foundry.utils.setProperty(item, "flags.monks-enhanced-journal.received", actor?.name);
                    foundry.utils.setProperty(item, "flags.monks-enhanced-journal.assigned", true);
                } else {
                    let qty = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
                    if (qty && qty != "")
                        foundry.utils.setProperty(item, "flags.monks-enhanced-journal.quantity", Math.max(qty - quantity, 0));
                }
                if (entry.getFlag('monks-enhanced-journal', 'type') == 'loot') {
                    for (let [key, item] of Object.entries(items)) {
                        let quantity = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity") ?? 0;
                        if (quantity <= 0) {
                            delete items[key];
                            items[`-=${key}`] = null;
                        }
                    }
                    entry.setFlag('monks-enhanced-journal', 'items', items);
                } else
                    entry.setFlag('monks-enhanced-journal', 'items', items);
                if (chatmessage)
                    this.sendChatPurchase(actor, item, purchased, user, quantity);
            }
        }
    }

    static async sendChatPurchase(actor, item, purchased = false, user = game.user.id, quantity = 1) {
        if (setting('chat-message')) {
            let speaker = ChatMessage.getSpeaker({ actor });

            let details = MonksEnhancedJournal.getItemDetails(item);

            let messageContent = {
                actor: { id: actor.id, name: actor.name, img: actor.img },
                items: [{ id: item.id, name: details.name, img: details.img, quantity: quantity }]
            }

            //create a chat message
            let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
            //get players that own this character
            if (actor.ownership.default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
                whisper = null;
            else {
                for (let [user, perm] of Object.entries(actor.ownership)) {
                    if (perm >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER && !whisper.find(u => u == user))
                        whisper.push(user);
                }
            }
            let content = await foundry.applications.handlebars.renderTemplate("./modules/monks-enhanced-journal/templates/receive-item.html", messageContent);
            let messageData = {
                user: user,
                speaker: speaker,
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                content: content,
                flavor: format("MonksEnhancedJournal.ActorPurchasedAnItem", { alias: (actor.alias ? actor.alias : actor.name), verb: (purchased ? i18n("MonksEnhancedJournal.Purchased").toLowerCase() : i18n("MonksEnhancedJournal.Received").toLowerCase()) }),
                whisper: whisper,
                flags: {
                    'monks-enhanced-journal': messageContent
                }
            };

            ChatMessage.create(messageData, {});
        }
    }

    async getItemData(data) {
        let document = await this.getDocument(data);
        if (!document)
            return null;

        let result = {
            id: document.id,
            uuid: document.uuid,
            img: document.img,
            name: document.name,
            quantity: "1",
            type: document.flags['monks-enhanced-journal']?.type
        };

        if (data.pack)
            result.pack = data.pack;

        return result;
    }

    static clearAllItems(event, target) {
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: i18n("MonksEnhancedJournal.ClearContents"),
            },
            content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${i18n("MonksEnhancedJournal.msg.AllItemsWillBeDeleted")}</p><p class="notes">Hold down the Ctrl key to clear locked items as well.</p>`,
            yes: {
                callback: async () => {
                    this.doClearAllItems(event?.ctrlKey);
                }
            },
        });
    }

    async doClearAllItems(clearLocked = false) {
        if (clearLocked) {
            await this.document.unsetFlag('monks-enhanced-journal', 'items');
        } else {
            let items = this.document.getFlag('monks-enhanced-journal', 'items') || {};
            for (let [k, v] of Object.entries(items)) {
                if (!v.lock)
                    await this.document.unsetFlag('monks-enhanced-journal', 'items.' + k);
            }
        }
    }

    static async editItem(event, target) {
        let id = target.closest('li').dataset.id;
        let items = (this.document.getFlag('monks-enhanced-journal', 'items') || {});

        let itemData = items[id];
        if (itemData) {
            if (game.system.id === "pf2e") {
                let rules = foundry.utils.getProperty(itemData, "system.rules");
                if (!(rules instanceof Array)) {
                    let newRules = [];
                    for (let v of Object.values(rules)) {
                        if (typeof v === "string") {
                            try {
                                newRules.push(JSON.parse(v));
                            } catch {
                                newRules.push(v);
                            }
                        } else {
                            newRules.push(v);
                        }
                    }
                    foundry.utils.setProperty(itemData, "system.rules", newRules);
                }
            }
            let item = new CONFIG.Item.documentClass(itemData);
            const itemCls = item._getSheetClass();
            if (itemCls.DEFAULT_OPTIONS) {
                item._sheet = new itemCls({ document: item, alterprice: true, addcost: (this.document.type == "shop") });
            } else {
                item._sheet = new itemCls(item, { alterprice: true, addcost: (this.document.type == "shop") });
            }
            let sheet = item.sheet;

            let newSubmit = async (event, form, submitData, updateOptions) => {
                event.preventDefault();

                if (game.system.id == "pf2e") {
                    $(sheet._element).find("tags ~ input").each(((_i, input) => {
                        "" === input.value && (input.value = "[]")
                    }))
                }

                if (game.system.id === "pf2e") {
                    let rules = foundry.utils.getProperty(submitData, "system.rules");
                    if (rules && !(rules instanceof Array)) {
                        let newRules = [];
                        for (let v of Object.values(rules)) {
                            if (typeof v === "string") {
                                try {
                                    newRules.push(JSON.parse(v));
                                } catch {
                                    newRules.push(v);
                                }
                            } else {
                                newRules.push(v);
                            }
                        }
                        foundry.utils.setProperty(submitData, "system.rules", newRules);
                    }
                }

                if (game.system.id == "dnd5e") {
                    if (foundry.utils.hasProperty(submitData, "system.properties")) {
                        submitData.system.properties = new Set(submitData.system.properties);
                    }
                }

                let items = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', 'items') || {});

                foundry.utils.mergeObject(sheet.document, submitData);

                let itm = items[id];
                if (itm) {
                    itm = foundry.utils.mergeObject(itm, submitData);
                    //let sysPrice = MEJHelpers.getSystemPrice(itm, pricename());
                    //let price = MEJHelpers.getPrice(sysPrice);
                    //foundry.utils.setProperty(itm, "flags.monks-enhanced-journal.price", `${price.value} ${price.currency}`);
                    await this.document.setFlag('monks-enhanced-journal', 'items', items);

                    if (game.system.id == "dnd5e") {
                        sheet.document.name = itm.name;
                    }
                }
                /*
                // Handle the form state prior to submission
                let closeForm = sheet.options.closeOnSubmit && !preventClose;
                const priorState = sheet._state;
                if (preventRender) sheet._state = states.RENDERING;
                if (closeForm) sheet._state = states.CLOSING;

                // Restore flags and optionally close the form
                sheet._submitting = false;
                if (preventRender) sheet._state = priorState;
                if (closeForm)
                    await sheet.close({ submit: false, force: true });
                else if (game.system.id == "dnd5e" && !preventRender) {
                    sheet.render(true);
                }

                if (!closeForm)
                    sheet.bringToTop();
                    */
            }

            sheet._processSubmitData = newSubmit.bind(sheet);
            sheet._mode = 2; // sheet.constructor.MODES.EDIT;
            try {
                if (sheet.constructor.DEFAULT_OPTIONS) {
                    sheet.render({ focus: true, force: true });
                } else {
                    sheet.render(true, { focus: true });
                }
            } catch {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ErrorTryingToEdit"));
            }
        }
    }

    async rollTable(itemtype = "items", useFrom = false) {
        let rolltables = [];

        if (!setting("hide-rolltables")) {
            for (let pack of game.packs) {
                if (pack.documentName == 'RollTable') {
                    const index = await pack.getIndex();
                    let entries = [];
                    const tableString = `Compendium.${pack.collection}.`;
                    for (let table of index) {
                        entries.push({
                            name: table.name.length > 32 ? table.name.substring(0, 30) + "..." : table.name,
                            uuid: tableString + table._id,
                        });
                    }

                    let groups = entries.sort((a, b) => { return a.name.localeCompare(b.name) }).reduce((a, v) => ({ ...a, [v.uuid]: v.name }), {});
                    rolltables.push({ text: pack.metadata.label, groups: groups });
                }
            };
        }

        let groups = game.tables.map(t => {
            return {
                uuid: t.uuid,
                name: t.name.length > 32 ? t.name.substring(0, 30) + "..." : t.name
            }
        }).sort((a, b) => { return a.name.localeCompare(b.name) }).reduce((a, v) => ({ ...a, [v.uuid]: v.name }), {});
        rolltables.push({ text: i18n("MonksEnhancedJournal.RollTables"), groups: groups });

        let that = this;

        let lastrolltable = that.document.getFlag('monks-enhanced-journal', "lastrolltable") || game.user.getFlag('monks-enhanced-journal', "lastrolltable");

        let table = await fromUuid(lastrolltable);

        let html = await foundry.applications.handlebars.renderTemplate("modules/monks-enhanced-journal/templates/roll-table.html", { rollTables: rolltables, useFrom: useFrom, lastrolltable: lastrolltable, rollformula: table?.formula });
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: i18n("MonksEnhancedJournal.PopulateFromRollTable"),
            },
            content: html,
            yes: {
                callback: async () => {
                    let getDiceRoll = async function (value, chatmessage = false) {
                        if (value.indexOf("d") != -1) {
                            let r = new Roll(value);
                            await r.evaluate({ async: true });
                            //if (chatmessage)
                            //    r.toMessage({ whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: null }, { rollMode: "self" });
                            value = r.total;
                        } else {
                            value = parseInt(value);
                            if (isNaN(value)) value = 1;
                        }

                        return value;
                    }

                    let rolltable = $('[name="rollable-table"]').val();
                    let numberof = $('[name="numberof"]').val();
                    let quantity = $('[name="quantity"]').val();
                    let reset = $('[name="reset"]').prop("checked");
                    let clear = $('[name="clear"]').val();
                    let duplicate = $('[name="duplicate"]').val();

                    let useFrom = $('[name="from"]').prop("checked");

                    let table = await fromUuid(rolltable);
                    if (table) {
                        await that.document.setFlag('monks-enhanced-journal', "lastrolltable", rolltable);
                        await game.user.setFlag('monks-enhanced-journal', "lastrolltable", rolltable);

                        numberof = await getDiceRoll(numberof);

                        let items = that.document.getFlag('monks-enhanced-journal', itemtype) || {};
                        let newItems = {};

                        if (clear != "none") {
                            this.doClearAllItems(clear == "all");
                        }

                        let currency = that.document.getFlag('monks-enhanced-journal', "currency") || {};
                        let currChanged = false;

                        for (let i = 0; i < numberof; i++) {
                            const available = table.results.filter(r => !r.drawn);

                            if (!table.formula || !available.length) {
                                if (table.formula && reset)
                                    await table.resetResults();
                                else {
                                    ui.notifications.warn("There are no available results which can be drawn from this table.");
                                    break;
                                }
                            }

                            let result = await table.draw({ rollMode: "selfroll", displayChat: false });

                            if (!result.results.length)
                                continue;

                            let item = null;

                            for (let tableresult of result.results) {
                                switch (tableresult.type) {
                                    case CONST.TABLE_RESULT_TYPES.DOCUMENT:
                                        {
                                            item = await fromUuid(tableresult.documentUuid);
                                        }
                                        break;
                                    default:
                                        if (foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.type") == 'loot') {
                                            async function tryRoll(formula) {
                                                try {
                                                    return (await (new Roll(formula)).roll({ async: true })).total || 1;
                                                } catch {
                                                    return 1;
                                                }
                                            }

                                            let text = tableresult.text;
                                            let textCoins = [];
                                            if (text.startsWith("{") && text.endsWith("}") && text.length > 2) {
                                                let splitStr = (text.indexOf("[") > -1 && text.indexOf("]") > -1) ? "," : " ";
                                                let rolls = text.substring(1, text.length - 1).trim().split(splitStr);
                                                for (let part of rolls) {
                                                    if (!part) continue;
                                                    let formula = part;
                                                    let coin = part.match(/\[[a-z]+\]/);
                                                    if (splitStr == " ")
                                                        [, formula, coin] = part.match(/^(.+?)(\D+)$/) ?? [];
                                                    if (Array.isArray(coin)) {
                                                        coin = coin[0];
                                                        formula = formula.replace(`${coin}`, '');
                                                        coin = coin.replace("[", "").replace("]", "");
                                                    }

                                                    textCoins.push({ formula, coin });
                                                }
                                            }

                                            // DND5E Award Enricher Parsing
                                            if (text.startsWith("[[/award") && text.endsWith("]]")) {
                                                const awards = text.substring(8, text.length - 2).trim().split(" ");
                                                for (const part of awards) {
                                                    if (!part) continue;
                                                    let [, formula, coin] = part.match(/^(.+?)(\D+)$/) ?? [];

                                                    textCoins.push({ formula, coin });
                                                }
                                            }

                                            for (let tc of textCoins) {
                                                if (tc.coin == undefined)
                                                    tc.coin = MEJHelpers.defaultCurrency();
                                                else if (MonksEnhancedJournal.currencies.find(c => c.id == tc.coin) == undefined)
                                                    continue;

                                                tc.coin = tc.coin?.toLowerCase();

                                                let value = await tryRoll(tc.formula);
                                                currency[tc.coin] = (currency[tc.coin] || 0) + value;
                                                currChanged = true;
                                            }
                                        }
                                }
                                /*
                                if (tableresult.collection === undefined) {
                                    //check to see if this is a roll for currency
                                    
                                } else {
                                    item = tableresult.collection.get(tableresult.id);
                                    if (tableresult.collection === "Item") {
                                        let collection = game.collections.get(tableresult.collection);
                                        if (collection)
                                            item = collection.get(tableresult.resultId);
                                    } else {
                                        // Try to find it in the compendium
                                        const items = game.packs.get(tableresult.collection);
                                        if (items)
                                            item = await items.getDocument(tableresult.resultId);
                                    }
                                }*/

                                if (item) {
                                    if (itemtype == "items" && item instanceof Item) {
                                        let itemData = item.toObject();

                                        if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                                            let id = itemData._id;
                                            itemData = await EnhancedJournalSheet.createScrollFromSpell(itemData);
                                            itemData._id = id;
                                        }

                                        let oldId = (itemData._id || itemData.id)?.replace("Item.", "");
                                        let oldItem = Object.values({ ...items, ...newItems }).find(i => {
                                            let parentId = i.flags['monks-enhanced-journal']?.parentId?.replace("Item.", "");
                                            return (!!oldId && !!parentId && parentId == oldId);
                                        });
                                        if (oldItem && duplicate != "additional") {
                                            if (duplicate == "increase") {
                                                let oldqty = foundry.utils.getProperty(oldItem, "flags.monks-enhanced-journal.quantity") || 1;
                                                let newqty = parseInt(oldqty) + parseInt(quantity != "" ? await getDiceRoll(quantity) : 1);
                                                foundry.utils.setProperty(oldItem, "flags.monks-enhanced-journal.quantity", newqty);
                                            }
                                        } else {
                                            itemData._id = itemData.id = makeid();
                                            let sysPrice = MEJHelpers.getSystemPrice(itemData, pricename());
                                            let price = MEJHelpers.getPrice(sysPrice);
                                            let adjustment = this.sheetSettings()?.adjustment || {};
                                            let sell = adjustment[itemData.type]?.sell ?? adjustment?.default?.sell ?? 1;
                                            let cost = MEJHelpers.getPrice(`${price.value * sell} ${price.currency}`);
                                            let itemQuantity = (quantity != "" ? await getDiceRoll(quantity) : 1);
                                            itemData.flags['monks-enhanced-journal'] = {
                                                parentId: oldId?.replace("Item.", ""),
                                                price: `${price.value} ${price.currency}`,
                                                cost: `${cost.value} ${cost.currency}`,
                                                quantity: itemQuantity,
                                                remaining: itemQuantity,
                                            };
                                            if (useFrom)
                                                foundry.utils.setProperty(itemData, "flags.monks-enhanced-journal.from", table.name);
                                            newItems[itemData.id] = itemData;
                                        }
                                    } else if (itemtype == "actors" && item instanceof Actor) {
                                        let itemQuantity = (quantity != "" ? await getDiceRoll(quantity) : 1);
                                        if (!newItems[item.id]) {
                                            let itemData = {
                                                id: item.id,
                                                uuid: item.uuid,
                                                img: item.img,
                                                name: item.name,
                                                quantity: itemQuantity,
                                                type: "Actor"
                                            }
                                            if (item.pack)
                                                itemData.pack = item.pack;
                                            newItems[item.id] = itemData;
                                        } else {
                                            if (duplicate == "increase") {
                                                newItems[item.id].quantity = parseInt(newItems[item.id].quantity) + itemQuantity;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (that.document.getFlag('monks-enhanced-journal', "type") == "quest" && itemtype == "items") {
                            let rewardId = game.user.getFlag('monks-enhanced-journal', `reward${this.document.id}`) || "";
                            let rewards = that.document.getFlag('monks-enhanced-journal', "rewards");
                            let reward = rewards[rewardId];
                            reward.itemIds = reward.itemIds.concat(Object.keys(newItems));
                            await that.document.setFlag('monks-enhanced-journal', "rewards", rewards);
                        }
                        items = foundry.utils.mergeObject(newItems, items);
                        await that.document.setFlag('monks-enhanced-journal', itemtype, items);

                        if (currChanged)
                            await that.document.setFlag('monks-enhanced-journal', "currency", currency);
                    }
                }
            },
            render: (html) => {
                $('input[name="numberof"]', html).on("blur", async () => {
                    if ($('input[name="numberof"]', html).val() == "") {
                        $('input[name="numberof"]', html).val(1);
                    }
                });
                $('input[name="quantity"]', html).on("blur", () => {
                    if ($('input[name="quantity"]', html).val() == "") {
                        $('input[name="quantity"]', html).val(1);
                    }
                });
                $('select[name="rollable-table"]', html).on("change", async () => {
                    let rolltable = $('[name="rollable-table"]').val();
                    let table = await fromUuid(rolltable);
                    $('.roll-formula', html).html(table?.formula);
                });
            }
        });
    }

    static onDeleteItem(event, target) {
        let item = target.closest('.item');
        let list = target.closest('.item-list');
        if (item && list)
            this.deleteItem(item.dataset.id, list.dataset.container);
    }

    async deleteItem(id, container, cascade = true) {
        let data = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"][container]);
        if (data instanceof Array) {
            data.findSplice(i => i.id == id || i._id == id);
            await this.document.setFlag('monks-enhanced-journal', container, data);
        } else {
            await this.document.unsetFlag('monks-enhanced-journal', `${container}.${id}`);
        }

        if (container == "relationships" && cascade) {
            let journal = game.journal.get(id);
            if (journal && journal.pages.size > 0) {
                let page = journal.pages.contents[0];
                if (journal.isOwner && page.isOwner) {
                    page.unsetFlag('monks-enhanced-journal', `relationships.${id}`);
                } else {
                    MonksEnhancedJournal.emit("deleteRelationship", { uuid: journal.uuid, id: this.document.id, page: this.document.id });
                }
            }
        }
    }

    static async onRevealRelationship(event, target) {
        let li = target.closest('li.item');

        // Toggle the hidden value for the current relationship
        let relationships = this.document.getFlag('monks-enhanced-journal', 'relationships') || {};
        relationships[li.dataset.id].revealed = !relationships[li.dataset.id].revealed;
        await this.document.setFlag('monks-enhanced-journal', 'relationships', relationships);
    }

    static async onToggleRelationship(event, target) {
        let li = target.closest('li.item');

        // Toggle the hidden value for the current relationship
        let relationships = this.document.getFlag('monks-enhanced-journal', 'relationships') || {};
        relationships[li.dataset.id].hidden = !relationships[li.dataset.id].hidden;
        await this.document.setFlag('monks-enhanced-journal', 'relationships', relationships);


        // Toggle 
        let journal;
        if (li.dataset.uuid) {
            journal = await fromUuid(li.dataset.uuid);
        } else {
            journal = game.journal.get(li.dataset.id);
        }
        if (journal && (journal instanceof JournalEntryPage || journal.pages.size > 0)) {
            let page = journal instanceof JournalEntryPage ? journal : journal.pages.contents[0];
            let otherRelationships = foundry.utils.duplicate(foundry.utils.getProperty(page, "flags.monks-enhanced-journal.relationships") || {});
            let otherRelationship = Object.values(otherRelationships).find(value => value.uuid == this.document.uuid || value.uuid == this.document.parent.uuid);
            if (otherRelationship) {
                otherRelationship.hidden = !otherRelationship.hidden;
                page.setFlag('monks-enhanced-journal', "relationships", otherRelationships);
            }
        }
    }

    async addItem(data) {
        data = data instanceof Array ? data : [data];
        let items = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].items || {});
        let addedItems = [];
        for (let d of data) {
            let item = await EnhancedJournalSheet.getDocument(d);

            if (item) {
                let oldId = (item._id || item.id)?.replace("Item.", "");
                let existingItem = Object.values(this.getItemList()).find(i => {
                    let parentId = i.flags["monks-enhanced-journal"]?.parentId?.replace("Item.", "");
                    return (!!oldId && !!parentId && parentId == oldId);
                });
                if (existingItem) {
                    // Increase quantity if already exists
                    existingItem = items[existingItem._id];
                    let quantity = parseInt(foundry.utils.getProperty(existingItem, "flags.monks-enhanced-journal.quantity")) + 1;
                    foundry.utils.setProperty(existingItem, "flags.monks-enhanced-journal.quantity", quantity);
                    let remaining = parseInt(foundry.utils.getProperty(existingItem, "flags.monks-enhanced-journal.remaining")) + 1;
                    foundry.utils.setProperty(existingItem, "flags.monks-enhanced-journal.remaining", remaining);
                    await this.document.setFlag('monks-enhanced-journal', 'items', items);
                } else {
                    if (getValue(item.system, quantityname()) || (item.type == "spell" && game.system.id == 'dnd5e')) {

                        let itemData = item.toObject();
                        if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                            itemData = await EncounterSheet.createScrollFromSpell(itemData);
                        }

                        let sysPrice = MEJHelpers.getSystemPrice(item, pricename()); //MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
                        let price = MEJHelpers.getPrice(sysPrice);
                        let sell = 1;
                        if (this.document.type == "shop") {
                            let adjustment = this.sheetSettings()?.adjustment || {};
                            sell = adjustment[item.type]?.sell ?? adjustment.default.sell ?? 1;
                        }
                        let flags = Object.assign({
                            hide: false,
                            lock: false,
                            quantity: 1,
                            remaining: 1,
                        }, foundry.utils.getProperty(itemData, "flags.monks-enhanced-journal"), {
                            parentId: item.id,
                            price: `${price.value} ${price.currency}`,
                            cost: (price.value * sell) + " " + price.currency
                        });
                        let update = {
                            _id: makeid(),
                            uuid: item.uuid,
                            flags: {
                                'monks-enhanced-journal': flags
                            }
                        };
                        if (game.system.id == "dnd5e") {
                            foundry.utils.setProperty(update, "system.equipped", false);
                        }

                        items[update._id] = foundry.utils.mergeObject(itemData, update);

                        addedItems.push(update);
                    } else {
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotAddItemType"));
                    }
                }
            }
        }

        this.document.flags["monks-enhanced-journal"].items = items;
        await this.document.setFlag('monks-enhanced-journal', 'items', items);

        return addedItems;
    }

    refillItems(id) {
        let items = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].items || {});

        if (id == 'all') {
            for (let id of Object.keys(items)) {
                foundry.utils.setProperty(items[id], "flags.monks-enhanced-journal.remaining", foundry.utils.getProperty(items[id], "flags.monks-enhanced-journal.quantity"));
            }
        } else {
            let item = items[id];
            if (item) {
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.remaining", foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity"));
            }
        }

        this.document.setFlag('monks-enhanced-journal', 'items', items);
    }

    static async onLockItem(event, target) {
        let id = target.closest('li.item').dataset.id;
        let collection = target.closest('.item-list').dataset.container;

        let items = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', collection) || {});
        if (["actors", "items"].includes(collection)) {
            if (items[id]) {
                items[id].lock = !items[id].lock;
                await this.document.setFlag('monks-enhanced-journal', collection, items);
            }
        }
    }

    static async onHideItem(event, target) {
        let li = target.closest('li.item');
        let id = li.dataset.id;
        let collection = target.closest('.item-list').dataset.container;

        let items = foundry.utils.duplicate(this.document.getFlag('monks-enhanced-journal', collection) || {});
        if (["actors", "relationships", "items"].includes(collection)) {
            if (items[id]) {
                items[id].hidden = !items[id].hidden;
                await this.document.setFlag('monks-enhanced-journal', collection, items);
            }

            if (collection == "relationships") {
                // Toggle 
                let journal;
                if (li.dataset.uuid) {
                    journal = await fromUuid(li.dataset.uuid);
                } else {
                    journal = game.journal.get(li.dataset.id);
                }
                if (journal && (journal instanceof JournalEntryPage || journal.pages.size > 0)) {
                    let page = journal instanceof JournalEntryPage ? journal : journal.pages.contents[0];
                    let otherRelationships = foundry.utils.duplicate(foundry.utils.getProperty(page, "flags.monks-enhanced-journal.relationships") || {});
                    let otherRelationship = Object.values(otherRelationships).find(value => value.uuid == this.document.uuid || value.uuid == this.document.parent.uuid);
                    if (otherRelationship) {
                        otherRelationship.hidden = !otherRelationship.hidden;
                        page.setFlag('monks-enhanced-journal', "relationships", otherRelationships);
                    }
                }
            }
        }
    }

    /*
    static async onAlterItem(event, target) {
        $(target).prev().click();
        if ($(target).hasClass('item-hide')) {
            let li = target.closest('li.item');
            let journal;
            if (li.dataset.uuid) {
                journal = await fromUuid(li.dataset.uuid);
            } else {
                journal = game.journal.get(li.dataset.id);
            }
            if (journal && (journal instanceof JournalEntryPage || journal.pages.size > 0)) {
                let page = journal instanceof JournalEntryPage ? journal : journal.pages.contents[0];
                let relationships = foundry.utils.duplicate(foundry.utils.getProperty(page, "flags.monks-enhanced-journal.relationships") || {});
                let relationship = relationships.find(r => r.uuid == this.document.parent.uuid);
                if (relationship) {
                    relationship.hidden = $(target).prev().prop('checked');
                    page.setFlag('monks-enhanced-journal', "relationships", relationships);
                }
            }
        } else if ($(target).hasClass('item-private')) {
            let li = $(target).closest('li.item');
            const id = li.data("id");
            let offerings = foundry.utils.duplicate(this.document.getFlag("monks-enhanced-journal", "offerings"));
            let offering = offerings.find(r => r.id == id);
            offering.hidden = $(target).prev().prop('checked');
            await this.document.setFlag('monks-enhanced-journal', "offerings", offerings);
        }
    }
    */

    /*
    async alterRelationship(event) {
        let li = $(event.currentTarget).closest('li.item');
        const uuid = li.data("uuid");
        let journal = await fromUuid(uuid);

        if (journal) {
            if ((this.document.type == "person" && journal.type == "person") || (this.document.type == "organization" && journal.type == "organization"))
                return;
            let relationships = foundry.utils.duplicate(journal.flags["monks-enhanced-journal"].relationships);
            let relationship = relationships.find(r => r.id == this.document.id);
            if (relationship) {
                relationship.relationship = $(event.currentTarget).val();
                journal.setFlag('monks-enhanced-journal', "relationships", relationships);
            }
        }
    }*/

    checkForChanges() {
        return $("prose-mirror", this.trueElement).toArray().some((editor) => {
            return editor.isDirty();
        });
    }

    async close(options) {
        if (options?.submit !== false) {
            if (this.checkForChanges()) {
                const confirm = await foundry.applications.api.DialogV2.confirm({
                    window: {
                        title: i18n("MonksEnhancedJournal.SaveChanges"),
                    },
                    content: `<p>${i18n("MonksEnhancedJournal.YouHaveChanges")}</p>`
                });
                if (!confirm) return false;
            }

            if (this.document.type == 'blank')
                return;

            //go through the scroll Y's and save the last position
            if (this.options.scrollY?.length) {
                const selectors = this.options.scrollY || [];
                let scrollPos = selectors.reduce((pos, sel) => {
                    const el = $(this.trueElement).find(sel);
                    if (el.length === 1) pos[sel] = el[0].scrollTop;
                    return pos;
                }, {});
                if (this.isEditable && this.document.isOwner)
                    this.document.setFlag('monks-enhanced-journal', 'scrollPos', JSON.stringify(scrollPos));
            }

            if (!this.enhancedjournal) {
                // check to see if there's a sound playing and stop it playing.
                this._stopSound(this._backgroundsound);
                delete this._backgroundsound;
                Hooks.off(game.modules.get("monks-sound-enhancements")?.active ? "globalSoundEffectVolumeChanged" : "globalInterfaceVolumeChanged", this._soundHook);
            }

            if (this.tempOwnership || (this.enhancedjournal && this.enhancedjournal.tempOwnership)) {
                if (this.document._source.ownership[game.user.id] == undefined)
                    delete this.document.ownership[game.user.id];
                else
                    this.document.ownership[game.user.id] = this.document._source.ownership[game.user.id];
                if (this.document.parent) {
                    if (this.document.parent._source.ownership[game.user.id] == undefined)
                        delete this.document.parent.ownership[game.user.id];
                    else
                        this.document.parent.ownership[game.user.id] = this.document.parent._source.ownership[game.user.id];
                }
                delete this.tempOwnership;
                delete this.enhancedjournal?.tempOwnership;
            }

            return super.close(options);
        }
    }

    static async _onShowPlayers(event, target, options = {}) {
        event.preventDefault();
        await this.submit();
        return foundry.documents.collections.Journal.showDialog(this.document, options);
    }

    static isLootActor(lootsheet) {
        return ['lootsheetnpc5e', 'merchantsheetnpc', 'item-piles'].includes(lootsheet);
    }

    static async assignItems(items, currency = {}, { clear = false, name = null } = {}) {
        let lootSheet = setting('loot-sheet');
        let lootEntity = setting('loot-entity');
        let collection = (EnhancedJournalSheet.isLootActor(lootSheet) ? game.actors : game.journal);

        let getLootableName = (entity, source) => {
            let lootname = i18n(setting("loot-name"));

            //find the folder and find the next available loot name
            let documents = (entity == undefined ? collection.filter(e => e.folder == undefined) : entity.contents || entity.pages || entity.parent.contents || entity.parent.pages);

            let idx = lootname.indexOf('{{name}}');
            if (idx > -1) {
                lootname = lootname.replace("{{name}}", source.name);
            }
            idx = lootname.indexOf('{{#}}');
            if (idx > -1) {
                let start = lootname.substring(0, idx).trim();
                let end = lootname.substring(idx + 5).trim();
                let num = 0;
                if (documents && documents.length) {
                    for (let doc of documents) {
                        if ((doc.name.startsWith(start) || start == "") && (doc.name.endsWith(end) || end == "")) {
                            let val = Number(doc.name.substr(start.length, doc.name.length - start.length - end.length));
                            if (!isNaN(val))
                                num = Math.max(num || 0, val);
                        }
                    }
                }

                lootname = lootname.replace("{{#}}", !isNaN(num) ? num + 1 : "");
            }
            return lootname;
        }

        let newitems = Object.values(items).map(i => {
            let item = foundry.utils.duplicate(i);
            item._id = makeid();
            return (foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining") > 0 ? item : null);
        }).filter(i => i);

        if (newitems.length == 0) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.NoItemsToAssign"));
            if (!Object.values(currency).some(c => !!c))
                return items;
        }

        let entity;
        try {
            entity = await fromUuid(lootEntity);
        } catch { }

        if (entity == undefined && lootEntity != "root")
            warn("Could not find Loot Entity, defaulting to creating one");

        if (entity == undefined || lootEntity == "root" || entity instanceof Folder || entity instanceof JournalEntry) {
            //create the entity in the correct Folder
            if (name == undefined || name == '')
                name = getLootableName(entity, this);

            if ((entity instanceof Folder || entity == undefined) && collection.documentName == "JournalEntry") {
                entity = await JournalEntry.create({ folder: entity, name: name, ownership: { 'default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } }, { render: false });
            }

            if (EnhancedJournalSheet.isLootActor(lootSheet)) {
                const cls = collection.documentClass;
                entity = await cls.create({ folder: entity, name: name, img: 'icons/svg/chest.svg', type: 'npc', flags: { core: { 'sheetClass': (lootSheet == "lootsheetnpc5e" ? 'dnd5e.LootSheetNPC5e' : 'core.a') } }, ownership: { 'default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
                ui.actors.render();
                MonksEnhancedJournal.emit("refreshDirectory", { name: "actors" });
            } else {
                entity = await JournalEntryPage.create({ name: name, type: "text", flags: { "monks-enhanced-journal": { type: "loot", purchasing: "confirm" } }, ownership: { 'default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } }, { parent: entity, render: false });
                ui.journal.render();
                MonksEnhancedJournal.emit("refreshDirectory", { name: "journal" });
            }
        }

        if (!entity) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CouldNotFindLootEntity"));
            return items;
        }

        if (clear) {
            if (EnhancedJournalSheet.isLootActor(lootSheet)) {
                for (let item of entity.items) {
                    await item.delete();
                }
            } else {
                await entity.setFlag('monks-enhanced-journal', 'items', []);
            }
        }

        if (EnhancedJournalSheet.isLootActor(lootSheet)) {
            if (lootSheet == "item-piles") {
                if (entity instanceof Folder || lootEntity == "root") {
                    let ipOptions = {
                        position: { x: ptAvg.x / ptAvg.count, y: ptAvg.y / ptAvg.count },
                        //items,
                        //itemPileFlags: { enabled: true }
                    };

                    let folder = entity;
                    let foldernames = [];
                    if (entity) {
                        foldernames = [folder?.name];
                        while (folder?.folder) {
                            folder = folder.folder;
                            foldernames.unshift(folder.name);
                        }
                    }
                    if (name == undefined || name == '')
                        name = this.getLootableName(entity);
                    ipOptions.actor = name;
                    ipOptions.actorOverrides = { name: name };
                    ipOptions.tokenOverrides = { name: name, actorLink: true };
                    ipOptions.folders = foldernames.length ? foldernames : null;
                    ipOptions.createActor = true;
                    let uuids = await ItemPiles.API.createItemPile(ipOptions);
                    entity = await fromUuid(uuids.actorUuid);
                } else if (entity instanceof Actor) {
                    await entity.update({ "flags.item-piles.data.enabled": true });
                }
                await ItemPiles.API.addItems(entity, newitems, { removeExistingActorItems: clear });
            } else {
                let itemData = newitems.map(i => {
                    let data = i.data;
                    data.system.quantity = i.quantity * i.sysQty;
                    if (data.system.equipped != undefined)
                        data.system.equipped = false;
                    return data;
                });
                entity.createEmbeddedDocuments("Item", itemData);
            }

            let newcurr = entity.system.currency || {};
            for (let curr of MonksEnhancedJournal.currencies) {
                if (currency[curr.id]) {
                    let cv = currency[curr.id];
                    if (typeof cv == "string" && cv.indexOf("d") != -1) {
                        let r = new Roll(cv);
                        await r.evaluate({ async: true });
                        cv = r.total;
                    } else
                        cv = parseInt(cv);
                    if (isNaN(cv))
                        cv = 0;
                    let newVal = parseInt(getValue(newcurr, curr.id) + cv);
                    setValue(newcurr, curr.id, newVal);
                }
            }

            if (Object.keys(newcurr).length > 0) {
                let data = {};
                if (currencyname() == "")
                    data = foundry.utils.mergeObject(data, newcurr);
                else
                    data[currencyname()] = newcurr;
                entity.update({ data: data });
            }
        } else if (lootSheet == 'monks-enhanced-journal') {
            let loot = foundry.utils.duplicate(entity.getFlag('monks-enhanced-journal', 'items') || {});

            loot = foundry.utils.mergeObject(loot, newitems);
            await entity.setFlag('monks-enhanced-journal', 'items', loot);

            let newcurr = entity.getFlag("monks-enhanced-journal", "currency") || {};
            for (let curr of MonksEnhancedJournal.currencies) {
                if (currency[curr.id]) {
                    let cv = currency[curr.id];
                    if (typeof cv == "string" && cv.indexOf("d") != -1) {
                        let r = new Roll(cv);
                        await r.evaluate({ async: true });
                        cv = r.total;
                    } else
                        cv = parseInt(cv);
                    if (isNaN(cv))
                        cv = 0;
                    newcurr[curr.id] = parseInt(getValue(newcurr, curr.id) + cv);
                }
            }
            await entity.setFlag('monks-enhanced-journal', 'currency', newcurr);
        }

        ui.notifications.info(format("MonksEnhancedJournal.ItemAddedToActor", { name: entity.name }));

        //set the currency to 0 and the remaining to 0 for all items
        for (let item of Object.values(items)) {
            if (foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining") > 0) {
                item = foundry.utils.mergeObject(item, { flags: { "monks-enhanced-journal": { remaining: 0, received: entity.name, assigned: true } } });
            }
        }

        return items;
    }

    static async onItemSummary(event, target) {
        let li = target.closest('li.item');
        const id = li.dataset.id;

        let itemData = (this.document.getFlag('monks-enhanced-journal', 'items') || {})[id];
        if (!itemData)
            return;

        let item = new CONFIG.Item.documentClass(itemData);
        let chatData = foundry.utils.getProperty(item, "system.description");
        if (item.getChatData && item.type != "spell") {
            try {
                let cdata = await item.getChatData({ secrets: false }, item);
                chatData = cdata;
            } catch {}
        }

        if (chatData instanceof Promise)
            chatData = await chatData;

        if (chatData) {
            // Toggle summary
            if ($(li).hasClass("expanded")) {
                let summary = $(li).children(".item-summary");
                summary.slideUp(200, () => summary.remove());
            } else {
                let div;
                if (game.system.id == "pf2e") {
                    var _a, _b;
                    const itemIsPhysical = item.isOfType("physical"),
                        gmVisibilityWrap = (span, visibility) => {
                            const wrapper = document.createElement("span");
                            return wrapper.dataset.visibility = visibility, wrapper.append(span), wrapper
                        },
                        rarityTag = itemIsPhysical ? (() => {
                            const span = document.createElement("span");
                            return span.classList.add("tag", item.rarity), span.innerText = game.i18n.localize(CONFIG.PF2E.rarityTraits[item.rarity]), gmVisibilityWrap(span, item.isIdentified ? "all" : "gm")
                        })() : null,
                        levelPriceLabel = itemIsPhysical && "coins" !== item.system.stackGroup ? (() => {
                            const price = item.price.value.toString(),
                                priceLabel = game.i18n.format("PF2E.Item.Physical.PriceLabel", {
                                    price
                                }),
                                levelLabel = game.i18n.format("PF2E.LevelN", {
                                    level: item.level
                                }),
                                paragraph = document.createElement("p");
                            return paragraph.dataset.visibility = item.isIdentified ? "all" : "gm", paragraph.append(levelLabel, document.createElement("br"), priceLabel), paragraph
                        })() : $(),
                        properties = null !== (_b = null === (_a = chatData.properties) || void 0 === _a ? void 0 : _a.filter((property => "string" == typeof property)).map((property => {
                            const span = document.createElement("span");
                            return span.classList.add("tag", "tag_secondary"), span.innerText = game.i18n.localize(property), itemIsPhysical ? gmVisibilityWrap(span, item.isIdentified ? "all" : "gm") : span
                        }))) && void 0 !== _b ? _b : [],
                        allTags = [rarityTag, ...Array.isArray(chatData.traits) ? chatData.traits.filter((trait => !trait.excluded)).map((trait => {
                            const span = document.createElement("span");
                            return span.classList.add("tag"), span.innerText = game.i18n.localize(trait.label), trait.description && (span.title = game.i18n.localize(trait.description), $(span).tooltipster({
                                maxWidth: 400,
                                theme: "crb-hover",
                                contentAsHTML: !0
                            })), itemIsPhysical ? gmVisibilityWrap(span, item.isIdentified || !trait.mystified ? "all" : "gm") : span
                        })) : [], ...properties].filter((tag => !!tag)),
                        propertiesElem = document.createElement("div");
                    propertiesElem.classList.add("tags", "item-properties"), propertiesElem.append(...allTags);
                    const description = chatData?.description?.value ?? item.description;
                    div = $('<div>').addClass("item-summary").append(propertiesElem, levelPriceLabel, `<div class="item-description">${description}</div>`);
                } else {
                    if (item.system?.identified === false && !game.user.isGM && foundry.utils.getProperty(item, "system.unidentified.description"))
                        chatData = foundry.utils.getProperty(item, "system.unidentified.description");
                    div = $(`<div class="item-summary">${(typeof chatData == "string" ? chatData : chatData.description.value ?? chatData.description)}</div>`);
                    if (typeof chatData !== "string") {
                        let props = $('<div class="item-properties"></div>');
                        chatData.properties.forEach(p => {
                            if (game.system.id == "pf1" && typeof p == "string" && p.startsWith(`${game.i18n.localize("PF1.ChargePlural")}:`)) {
                                let prop = p;
                                const uses = item.system?.uses;
                                if (uses) prop = `${game.i18n.localize("PF1.ChargePlural")}: ${uses.value}/${uses.max}`;
                                props.append(`<span class="tag">${prop}</span>`);
                            } else
                                props.append(`<span class="tag">${p.name || p}</span>`)
                        });
                        if (chatData.price != undefined) {
                            let price = chatData.price;
                            if (price.denomination)
                                price = `${price.value} ${price.denomination}`;
                            props.append(`<span class="tag">${i18n("MonksEnhancedJournal.Price")}: ${price}</span>`);
                        }
                        div.append(props);
                    }
                }
                $(li).append(div.hide());
                div.slideDown(200);
            }
            $(li).toggleClass("expanded");
        }
    }

    async addRelationship(relationship, cascade = true) {
        let entity = await fromUuid(relationship.uuid);

        if (!entity)
            return;

        if (entity.id == this.document.parent.id)
            return;

        if (!relationship.id)
            relationship.id = entity.id;

        let page = entity.pages.contents[0];
        let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
        if (this.allowedRelationships.includes(type)) {
            let relationships = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].relationships || {});

            //only add one item
            if (relationships[relationship.id] != undefined)
                return;

            relationships[relationship.id] = relationship;
            this.document.setFlag("monks-enhanced-journal", "relationships", relationships);

            //add the reverse relationship
            if (cascade) {
                let original = await fromUuid(relationship.uuid);
                let orgPage = original.pages.contents[0];
                if (original.isOwner && orgPage.isOwner) {
                    MonksEnhancedJournal.fixType(orgPage);
                    let sheet = orgPage.sheet;
                    sheet.addRelationship({ id: this.document.parent.id, uuid: this.document.parent.uuid, hidden: true }, false);
                } else {
                    MonksEnhancedJournal.emit("addRelationship", { uuid: relationship.uuid, relationship: { id: this.document.parent.id, uuid: this.document.parent.uuid }, page: this.document.id, hidden: true });
                }
            }
        }
    }

    static async onOpenRelationship(event, target) {
        let item = target.closest('.item');
        let journal;
        if (item.dataset.uuid) {
            journal = await fromUuid(item.dataset.uuid);
        } else {
            journal = game.journal.get(item.dataset.id);
        }
        if (!journal.testUserPermission(game.user, "LIMITED"))
            return ui.notifications.error("You don't have permissions to view this document");

        this.open(journal, event);
    }

    static async createScrollFromSpell(itemData) {

        // Get spell data
        const {
            actionType, description, source, activation, duration, target, range, damage, formula, save, level
        } = itemData.system;

        // Get scroll data
        const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
        const scrollItem = await fromUuid(scrollUuid);
        const scrollData = scrollItem.toObject();
        delete scrollData._id;

        // Split the scroll description into an intro paragraph and the remaining details
        const scrollDescription = scrollData.system.description?.value;
        const pdel = "</p>";
        const scrollIntroEnd = scrollDescription.indexOf(pdel);
        const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
        const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

        // Create a composite description from the scroll description and the spell details
        const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

        // Create the spell scroll data
        const spellScrollData = foundry.utils.mergeObject(scrollData, {
            name: `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
            img: itemData.img,
            system: {
                description: { value: desc.trim() }, source, actionType, activation, duration, target, range, damage, formula,
                save, level
            }
        });
        return spellScrollData;
    }

    collapseItemSection(event) {
        let header = $(event.currentTarget);
        let ul = header.parent().next();

        let that = this;
        if (header.hasClass("collapsed")) {
            header.removeClass("collapsed");
            return new Promise(resolve => {
                ul.slideDown(200, () => {
                    //icon.removeClass("fa-caret-down").addClass("fa-caret-up");
                    that.document._itemList[header.data("id")] = false;
                    return resolve(false);
                });
            });
        } else {
            header.addClass("collapsed");
            return new Promise(resolve => {
                ul.slideUp(200, () => {
                    //icon.removeClass("fa-caret-up").addClass("fa-caret-down");
                    that.document._itemList[header.data("id")] = true;
                    return resolve(true);
                });
            });
        }
    }

    static clearScale(event) {
        $('button[data-action="resetScale"]', this.trueElement).removeClass("scale");
        $('div.picture-outer', this.trueElement).data({ "size": 100, "translate": { x: -50, y: -50 } });
        $('div.picture-outer .picture-img', this.trueElement).css({ "transform": "translate(-50%, -50%) scale(1)" });
    }

    scaleImage(event) {
        event.stopPropagation();
        event.preventDefault();

        if (event.ctrlKey || event.metaKey) {
            let wheel = (-event.originalEvent.wheelDelta || event.originalEvent.deltaY || event.originalEvent.detail);

            let size = parseInt($(event.currentTarget).data("size") ?? 100);
            size += (wheel < 0 ? -5 : 5);
            size = Math.max(size, 5);

            console.log(size);

            $(event.currentTarget).data("size", size);
            let translate = $(event.currentTarget).data("translate");
            $('.picture-img', event.currentTarget).css({ "transform": `translate(${translate?.x ?? -50}%, ${translate?.y ?? -50}%) scale(${size / 100})` });

            $('button[data-action="resetScale"]', this.trueElement).addClass("scale");
        }
    }

    checkScale(event) {
        if (event.ctrlKey || event.metaKey) {
            $(event.currentTarget).addClass("scaling").data({ "position": $(event.currentTarget).data("translate"), "origin": { x: event.clientX, y: event.clientY } });
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    }

    moveScale(event) {
        if ($(event.currentTarget).hasClass("scaling")) {
            $('button[data-action="resetScale"]', this.trueElement).addClass("scale");

            let origin = $(event.currentTarget).data("origin");
            let position = $(event.currentTarget).data("position") || { x: -50, y: -50 };

            let dx = ((event.clientX - origin.x) / $(event.currentTarget).width()) * 100;
            let dy = ((event.clientY - origin.y) / $(event.currentTarget).height()) * 100;

            let size = $(event.currentTarget).data("size") ?? 100;
            let posX = Math.max(Math.min(position.x + dx, 40), -140);
            let posY = Math.max(Math.min(position.y + dy, 40), -140);
            $(event.currentTarget).data("translate", { x: posX, y: posY });
            $('.picture-img', event.currentTarget).css({ "transform": `translate(${posX}%, ${posY}%) scale(${size / 100})` });
        }
    }

    releaseScale(event) {
        $('div.picture-outer', this.trueElement).removeClass("scaling");
        event.currentTarget.releasePointerCapture(event.pointerId);
    }

    static async splitJournal() {
        let ctrl = window.getSelection().baseNode?.parentNode || window.getSelection().anchorNode?.parentNode;

        if (ctrl == undefined) {
            ui.notifications.info(i18n("MonksEnhancedJournal.NoTextSelected"));
            return;
        }

        //make sure this is editor content selected
        if ($(ctrl).closest('.editor-container,.editor-display').length > 0) {
            var selection = window.getSelection().getRangeAt(0);
            var selectedText = selection.extractContents();
            let selectedHTML = $('<div>').append(selectedText);
            if (selectedHTML.html() != '') {
                let title = $('h1,h2,h3,h4', selectedHTML).first().text().trim() || i18n("MonksEnhancedJournal.ExtractedJournalEntry");

                //create a new Journal entry in the same folder as the current object
                //set the content to the extracted text (selectedHTML.html()) and use the title
                let type = foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.type");
                if (type == "base" || type == "oldentry") type = "journalentry";
                let types = MonksEnhancedJournal.getDocumentTypes();
                if (types[type]) {
                    let newentry = await JournalEntry.create({ name: title, folder: this.document.parent.folder, flags: { 'monks-enhanced-journal': { type: 'journalentry' } } }, { render: false });
                    let data = { name: title, type: 'text', text: { content: `<p>${selectedHTML.html()}</p>` }, flags: { 'monks-enhanced-journal': { type: 'journalentry' } } };
                    await JournalEntryPage.create(data, { parent: newentry });
                    ui.journal.render();
                    MonksEnhancedJournal.emit("refreshDirectory", { name: "journal" });

                    //add a new tab but don't switch to it
                    this.enhancedjournal.addTab(newentry, { activate: false });
                    this.enhancedjournal.render();

                    //save the current entry and refresh to make sure everything is reset
                    await this.document.update({ text: { content: $(ctrl).closest('.editor-container,.editor-display').html() } });
                    if (this.enhancedjournal)
                        this.enhancedjournal.render();
                    else
                        this.render();
                }
            } else
                ui.notifications.warn(i18n("MonksEnhancedJournal.NothingSelected"));
        } else {
            ui.notifications.warn(i18n("MonksEnhancedJournal.NoEditorContent"));
        }
    }

    async copyToChat() {
        let ctrl = window.getSelection().baseNode?.parentNode || window.getSelection().anchorNode?.parentNode;

        if (ctrl == undefined) {
            ui.notifications.info(i18n("MonksEnhancedJournal.NoTextSelected"));
            return;
        }

        //make sure this is editor content selected
        if ($(ctrl).closest('div.editor-display,.editor-control').length > 0) {
            var selection = window.getSelection().getRangeAt(0);
            var selectedText = selection.cloneContents();
            let selectedHTML = $('<div>').append(selectedText);
            if (selectedHTML.html() != '') {
                let messageData = {
                    user: game.user.id,
                    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                    content: selectedHTML.html(),
                };

                ChatMessage.create(messageData, {});
            } else
                ui.notifications.warn(i18n("MonksEnhancedJournal.NothingSelected"));
        } else {
            ui.notifications.warn(i18n("MonksEnhancedJournal.NoEditorContent"));
        }
    }

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        let id = li.dataset.id;

        let itemData = (foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.items") || {})[id];
        if (itemData) {
            let cls = game.items.documentClass;
            let item = new cls(itemData);
            if (item.displayCard)
                item.displayCard();
        }
    }

    static addLog(options = {}) {
        let { actor, item, quantity, price, type } = options
        if (game.user.isGM) {
            let log = foundry.utils.duplicate(this.getFlag("monks-enhanced-journal", "log") || []);
            log.unshift({ actor, item, quantity, price, type, time: Date.now() });
            this.setFlag("monks-enhanced-journal", "log", log);
        } else {
            MonksEnhancedJournal.emit("addLog", Object.assign({ entityId: this.uuid }, options))
        }
    }

    static onConfigureSheet(event) {
        event.stopPropagation(); // Don't trigger other events
        if (event.detail > 1) return; // Ignore repeated clicks

        const docSheetConfigWidth = foundry.applications.apps.DocumentSheetConfig.DEFAULT_OPTIONS.position.width;
        new foundry.applications.apps.DocumentSheetConfig({
            document: this.document,
            position: {
                top: this.position.top + 40,
                left: this.position.left + ((this.position.width - docSheetConfigWidth) / 2)
            }
        }).render({ force: true });
    }

    searchText(query) {
        if (this.enhancedjournal)
            this.enhancedjournal.searchText.call(this.enhancedjournal, query);
    }

    _onRevealSecret(event) {
        let container = event.target.closest('div[data-key]');
        let key = container.dataset.key;
        const content = foundry.utils.getProperty(this.document, key);
        const modified = event.target.toggleRevealed(content);
        let update = {};
        update[key] = modified;
        this.document.update(update);
    }

    async addActor(data) {
        let actor = await this.getItemData(data);

        if (actor) {
            let update = {};
            if (!this.document.name)
                update.name = actor.name;
            if (!this.document.src)
                update.src = actor.img;
            await this.document.update(update);
            await this.document.setFlag("monks-enhanced-journal", "actor", actor);
        }
    }

    openActor(event) {
        let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
        let actor = game.actors.find(a => a.id == actorLink.id);
        if (!actor)
            return;

        actor.sheet.render(true);
    }

    removeActor() {
        this.document.unsetFlag('monks-enhanced-journal', 'actor');
        $('.actor-img-container', this.trueElement).remove();
    }

    async _onDropOffering(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Item') {
            this.addOffering(data);
        } else
            return false;
    }

    async addOffering(data) {
        let item = await fromUuid(data.uuid);
        if (!(item?.parent instanceof Actor)) {
            ui.notifications.warn("Offerings must come from an Actor");
            return;
        }
        new MakeOffering({
            document: this.document, journalsheet: this,
            offering: {
                actor: {
                    id: item.parent.id,
                    name: item.parent.name,
                    img: item.parent.img
                },
                items: [{
                    id: item.id,
                    itemName: item.name,
                    actorId: item.parent.id,
                    actorName: item.parent.name,
                    qty: 1
                }]
            }
        }).render(true);
    }

    static onOpenOfferingActor(event, target) {
        let id = target.closest(".item").dataset.actorId;
        let actor = game.actors.find(a => a.id == id);
        if (!actor)
            return;

        actor.sheet.render(true);
    }

    static onMakeOffering() {
        new MakeOffering({ document: this.document, journalsheet: this }).render(true);
    }

    static onCancelOffer(event, target) {
        let li = target.closest('li.item');
        const id = li.dataset.id;

        if (game.user.isGM || this.document.isOwner) {
            let offerings = foundry.utils.duplicate(this.document.getFlag("monks-enhanced-journal", "offerings"));
            let offering = offerings.find(r => r.id == id);
            offering.hidden = true;
            offering.state = "cancelled";
            this.document.setFlag('monks-enhanced-journal', "offerings", offerings);
        } else
            MonksEnhancedJournal.emit("cancelOffer", { id: id, uuid: this.document.uuid });
    }

    static async onAcceptOffer(event, target) {
        let li = target.closest('li.item');
        const id = li.dataset.id;

        let offerings = foundry.utils.duplicate(this.document.getFlag("monks-enhanced-journal", "offerings"));
        let offer = offerings.find(r => r.id == id);
        if (!offer)
            return;

        offer.state = "accepted";

        let offering = foundry.utils.duplicate(offer);

        let actor = game.actors.get(offering.actor.id);
        if (!actor) {
            ui.notifications.error("Actor no longer exists, cannot accept this offering");
            return;
        }

        //confirm that there's enough currency and that the items still exist
        for (let item of offering.items) {
            item.actor = actor;
            if (item.actorId != offering.actorId) {
                item.actor = game.actors.get(item.actorId);

                if (!item.actor) {
                    ui.notifications.error(`Actor ${item.actorName} no longer exists, cannot accept this offering`);
                    return;
                }
            }

            item.item = item.actor.items.get(item.id);
            if (!item.item) {
                ui.notifications.error(`Item ${item.itemName} no longer exists, cannot accept this offering`);
                return;
            }

            item.max = getValue(item.item.system, quantityname());
            if (item.qty > item.max) {
                ui.notifications.error(`Not enough of ${item.name} exists, cannot accept this offering`);
                return;
            }
        }

        // If we've made it here then we're good to process this offer
        let destActor;
        let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink)
            destActor = game.actors.find(a => a.id == actorLink.id);

        for (let [k, v] of Object.entries(offering.currency)) {
            this.addCurrency(actor, k, -v);
            if (destActor)
                this.addCurrency(destActor, k, v);
        }

        for (let item of offering.items) {
            if (destActor) {
                let itemData = foundry.utils.duplicate(item.item);
                delete itemData._id;
                let itemQty = getValue(itemData, quantityname(), 1);
                setValue(itemData, quantityname(), item.qty * itemQty);
                let sheet = destActor.sheet;
                if (sheet._onDropItem)
                    sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, itemData);
                else
                    destActor.createEmbeddedDocuments("Item", [itemData]);
            }
            // Save the image if we're about to delete it
            let realitem = offer.items.find(i => i.id == item.id);
            realitem.img = item.item.img;

            if (item.qty == item.max) {
                await item.item.delete();
            } else {
                let qty = item.max - item.qty;
                let update = { system: {} };
                update.system[quantityname()] = item.item.system[quantityname()];
                setValue(update, quantityname(), qty);
                await item.item.update(update);
            }
        }

        this.document.setFlag('monks-enhanced-journal', "offerings", offerings);
    }

    static onRejectOffer(event, target) {
        let li = target.closest('li.item');
        const id = li.dataset.id;

        let offerings = foundry.utils.duplicate(this.document.getFlag("monks-enhanced-journal", "offerings"));
        let offering = offerings.find(r => r.id == id);
        if (offering) {
            offering.state = "rejected";
            this.document.setFlag('monks-enhanced-journal', "offerings", offerings);
        }
    }

    static async onChangePlayerPermissions(event, target) {
        let ownership = this.document.parent.ownership;
        let showing = ownership['default'] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        ownership['default'] = (showing ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
        await this.document.parent.update({ ownership: ownership });
        this.render(true);
    }

    static onCopyUuid(event) {
        event.preventDefault(); // Don't open context menu
        event.stopPropagation(); // Don't trigger other events
        if (event.detail > 1) return; // Ignore repeated clicks
        const id = event.button === 2 ? this.document.id : this.document.uuid;
        const type = event.button === 2 ? "id" : "uuid";
        const label = game.i18n.localize(this.document.constructor.metadata.label);
        game.clipboard.copyPlainText(id);
        ui.notifications.info("DOCUMENT.IdCopiedClipboard", { format: { label, type, id } });
    }

    static onOpenActor(event, target) {
        this.openActor(event);
    }

    static onCopyImage(event, target) {
        // Copy the image path to the clipboard
        let img = this.document.src;
        if (!img) {
            let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
            let actor = game.actors.find(a => a.id == actorLink?.id);
            if (!actor) {
                ui.notifications.info("No image set for this entry");
                return;
            }
            img = actor.img;
        }
        game.clipboard.copyPlainText(img);
        ui.notifications.info("Image path copied to clipboard");
    }

    static async onGenerateName(event, target) {
        let names = [];
        for (let i = 0; i < 5; i++) {
            let name = await this.createName();
            if (name)
                names.push(name);
        }

        let buttons = names.map((name, index) => {
            return {
                type: "button",
                action: `selectName${index}`,
                label: name,
                callback: (event, target) => {
                    let index = target.dataset.index;
                    return names[index];
                }
            }
        });

        let context = { names: names };
        let html = await foundry.applications.handlebars.renderTemplate("modules/monks-enhanced-journal/templates/generate-name.html", context);

        let name = await foundry.applications.api.DialogV2.wait({
            window: {
                title: `Generate a new name`,
                contentClasses: ["flexcol"]
            },
            position: { width: 300 },
            content: html,
            render: (event, dialog) => {
                $(".dialog-form > footer", dialog.element).hide();
                $("button[data-action='generate']", dialog.element).on("click", async (event) => {
                    event.preventDefault();
                    for (let i = 0; i < 5; i++) {
                        let name = await this.createName();
                        if (name) {
                            names[i] = name;
                            $(`button[data-index="${i}"]`, dialog.element).html(name);
                        }
                    }
                });
                $("button[data-action='cancel']", dialog.element).on("click", (event) => {
                    event.preventDefault();
                    dialog.close();
                });
            },
            buttons
        });

        if (name) {
            await this.document.update({ name: name });
        }
    }
}