import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class JournalEntrySheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        window: {
            resizable: true,
            contentClasses: ["journal-sheet"]
        },
        form: {
            submitOnChange: true
        },
        actions: {
            configCategories: JournalEntrySheet.onConfigureCategories,
            createPage: JournalEntrySheet.createPageDialog,
            editPage: JournalEntrySheet.onEditPage,
            editObservedPage: JournalEntrySheet.onEditObservedPage,
            goToHeading: JournalEntrySheet.onGoToHeading,
            nextPage: JournalEntrySheet.nextPage,
            previousPage: JournalEntrySheet.previousPage,
            toggleLock: JournalEntrySheet.onToggleLock,
            toggleMode: JournalEntrySheet.onToggleMode,
            toggleSearch: JournalEntrySheet.toggleSearchMode,
            toggleSidebar: JournalEntrySheet.toggleSidebar
        }
    };

    static PARTS = {
        sidebar: {
            template: "modules/monks-enhanced-journal/templates/sheets/partials/journal_sidebar.hbs",
            templates: ["modules/monks-enhanced-journal/templates/sheets/partials/journal_toc.hbs"],
            scrollable: [".toc"]
        },
        pages: {
            template: "modules/monks-enhanced-journal/templates/sheets/partials/journal_pages.hbs",
            scrollable: [".journal-entry-pages"]
        }
    };

    _documentControls() {
        let ctrls = [
            { id: 'lock', leftAlign: true, label: this.viewLockLabel, icon: this.viewLockIcon, visible: this.document.isEditable, action: "toggleLock" },
            { id: 'collapse-sidebar', leftAlign: true, label: this.viewCollapseLabel, icon: "fas fa-list", visible: !!this.enhancedjournal, action: "toggleSidebar" },
            { label: '<i class="fas fa-search"></i>', type: 'text' },
            //{ id: 'search-mode', label: this.searchModeLabel, icon: this.searchModeIcon, visible: !!this.enhancedjournal, action: "toggleSearch" },
            { id: 'search', type: 'input', label: "Search", visible: !!this.enhancedjournal, callback: this.searchText },
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'edit', label: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fas fa-pencil-alt', visible: this.isEditable, action: "editObservedPage" },
            { id: 'add-page', label: i18n("JOURNAL.AddPage"), icon: 'fas fa-file-circle-plus', visible: this.document.isEditable, action: "createPage" },
            { id: 'toggle-menu', label: this.viewModeLabel, icon: this.viewModeIcon, action: "toggleMode" },
        ];
        return ctrls.concat(super._documentControls());
    }

    get viewCollapseLabel() {
        return this.sidebarExpanded ? i18n("JOURNAL.ViewCollapse") : i18n("JOURNAL.ViewExpand");
    }

    get viewLockIcon() {
        return this.locked ? 'fa-solid fa-lock' : 'fa-solid fa-unlock';
    }

    get viewLockLabel() {
        return this.locked ? i18n("JOURNAL.LockModeLocked") : i18n("JOURNAL.LockModeUnlocked");
    }

    get viewModeIcon() {
        return this.isMultiple ? 'fa-solid fa-notes' : 'fa-solid fa-note';
    }

    get viewModeLabel() {
        return this.isMultiple ? i18n("JOURNAL.ModeMultiple") : i18n("JOURNAL.ModeSingle");
    }

    get searchModeIcon() {
        return this.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "fa-solid fa-magnifying-glass" : "fa-solid fa-file-magnifying-glass";
    }

    get searchModeLabel() {
        return this.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? i18n("SIDEBAR.SearchModeName") : i18n("SIDEBAR.SearchModeFull");
    }

    get classes() {
        let result = super.classes;
        if (this.sidebarExpanded)
            result.push('expanded');

        return result;
    }

    static INTERSECTION_RATIO = .25;

    static OWNERSHIP_ICONS = {
        [CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE]: "fa-solid fa-eye-slash",
        [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER]: "fa-solid fa-eye",
        [CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]: "fa-solid fa-feather-pointed"
    };

    static VIEW_MODES = {
        SINGLE: 1,
        MULTIPLE: 2
    };

    static get type() {
        return 'journal-entry';
    }

    categorizedPages;

    get entry() {
        return this.document;
    }

    filteredPages = new Set();

    headingIntersections = new Map();

    get isMultiple() {
        return this.mode === this.constructor.VIEW_MODES.MULTIPLE;
    }

    get locked() {
        return this.entry.getFlag("core", "locked") ?? false;
    }

    get mode() {
        return this.#mode ?? this.options.mode ?? this.entry.getFlag("core", "viewMode") ?? this.constructor.VIEW_MODES.SINGLE;
    }

    #mode;

    get observer() {
        return this.#observer;
    }

    #observer;

    get pageId() {
        return this.#pageId ?? this.options.pageId;
    }

    set pageId(value) {
        this.#pageId = value;
        game.user.setFlag("monks-enhanced-journal", `pagestate.${this.entry.id}.pageId`, value);
    }

    #pageId;

    get pageIndex() {
        return Object.keys(this._pages).findIndex(id => id === this.pageId);
    }

    set pageIndex(value) {
    }

    _pages;

    get pagesInView() {
        return this.#pagesInView;
    }

    #pagesInView = [];

    search;

    get searchMode() {
        return this.#searchMode ?? CONST.DIRECTORY_SEARCH_MODES.NAME;
    }

    #searchMode;

    sheets = {};

    get sidebarExpanded() {
        return this.sidebarState.expanded;
    }

    sidebarState = {
        expanded: this.options.expanded ?? !setting("start-toc-collapsed"),
        active: false,
        position: 0
    };

    syncState = null;

    tempOwnership = false;

    get title() {
        const { folder, name } = this.entry;
        return this.entry.permission ? `${folder ? `${folder.name}: ` : ""}${name}` : "";
    }

    get canPrev() {
        return this._pages && this.pageIndex > 0;
    }

    get canNext() {
        return this._pages && (this.pageIndex < Object.keys(this._pages).length - 1);
    }

    _activatePagesInView() {
        if (!this.trueElement) return;
        const pageIds = new Set(this.pagesInView.map(p => p.dataset.pageId));
        // Update the pageId to the first page in view in case the mode is switched to single page view.
        if (pageIds.size) this.pageId = pageIds.first();
        let activeChanged = false;
        this.trueElement.querySelectorAll(".toc li[data-page-id]").forEach(el => {
            activeChanged ||= el.classList.contains("active") !== pageIds.has(el.dataset.pageId);
            el.classList.toggle("active", pageIds.has(el.dataset.pageId));
        });
        if (activeChanged) this._synchronizeSidebar();
    }

    _configureRenderOptions(options) {
        // Temporary ownership override.
        if ("tempOwnership" in options) this.tempOwnership = options.tempOwnership;

        this._pages = this._preparePageData();

        // Page changed
        this._setCurrentPage(options);

        this._updateButtonState();

        super._configureRenderOptions(options);
    }

    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        if (this.isMultiple) {
            for (const id of Object.keys(this._pages)) {
                parts[id] = { template: "templates/journal/page.hbs" };
            }
        }
        else parts[this.pageId] = { template: "templates/journal/page.hbs" };
        return parts;
    }

    _getEntryContextOptions() {
        const getPage = li => this.entry.pages.get(li.dataset.pageId);
        return [{
            name: "SIDEBAR.Edit",
            icon: '<i class="fa-solid fa-pen-to-square"></i>',
            condition: li => this.isEditable && getPage(li)?.canUserModify(game.user, "update"),
            callback: li => getPage(li).sheet.render(true)
        }, {
            name: "SIDEBAR.Delete",
            icon: '<i class="fa-solid fa-trash"></i>',
            condition: li => this.isEditable && getPage(li)?.canUserModify(game.user, "delete"),
            callback: li => {
                const { top, right } = li.getBoundingClientRect();
                return getPage(li).deleteDialog({ position: { top, left: right } });
            }
        }, {
            name: "SIDEBAR.Duplicate",
            icon: '<i class="fa-regular fa-copy"></i>',
            condition: this.isEditable,
            callback: li => {
                const page = getPage(li);
                return page?.clone({ name: game.i18n.format("DOCUMENT.CopyOf", { name: page.name }) }, {
                    save: true, addSource: true
                });
            }
            }, {
                name: "Extract",
                icon: '<i class="fas fa-file-arrow-down"></i>',
                condition: li => getPage(li)?.isOwner,
                callback: async (li) => {
                    const page = getPage(li);
                    if (page) {
                        let data = this.document.toObject();
                        data.name = page.name;
                        let pageData = page.toObject();
                        delete pageData._id;
                        data.pages = [pageData];
                        delete data._id;
                        let newDoc = await JournalEntry.create(data);

                        //page.delete();

                        MonksEnhancedJournal.openJournalEntry(newDoc);
                    }
                }
            }, {
            name: "OWNERSHIP.Configure",
            icon: '<i class="fa-solid fa-lock"></i>',
            condition: game.user.isGM,
            callback: li => {
                const { top, right } = li.getBoundingClientRect();
                new foundry.applications.apps.DocumentOwnershipConfig({
                    document: getPage(li),
                    position: { top, left: right }
                }).render({ force: true });
            }
        }, {
            name: "JOURNAL.ActionShow",
            icon: '<i class="fa-solid fa-eye"></i>',
            condition: li => getPage(li)?.isOwner,
            callback: li => Journal.showDialog(getPage(li))
        }, {
            name: "SIDEBAR.JumpPin",
            icon: '<i class="fa-solid fa-crosshairs"></i>',
            condition: li => !!getPage(li)?.sceneNote,
            callback: li => canvas.notes.panToNote(getPage(li).sceneNote)
        }];
    }

    _initializeApplicationOptions(options) {
        const applicationOptions = super._initializeApplicationOptions(options);
        applicationOptions.window.icon ??= CONFIG.JournalEntry.sidebarIcon;
        return applicationOptions;
    }

    _getHeaderControls() {
        const controls = super._getHeaderControls();
        controls.push({
            icon: "fa-solid fa-chart-tree-map",
            label: "JOURNAL.ConfigureCategories",
            visible: this.isEditable,
            action: "configCategories"
        });
        return controls;
    }

    async _dragDrop(html) {
        super._dragDrop(html);
        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".toc :is([data-page-id], [data-anchor])",
            dropSelector: ".toc",
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(html);
    }

    async _contextMenu(html) {
        new foundry.applications.ux.ContextMenu(html, ".toc .page", this._getEntryContextOptions(), {
            hookName: "getJournalEntryPageContextOptions",
            parentClassHooks: false,
            onOpen: this._onContextMenuOpen.bind(this),
            onClose: this._onContextMenuClose.bind(this),
            jQuery: false
        });
    }

    async activateListeners(html) {
        await super.activateListeners(html);
        $(html).on("click", "img:not(.nopopout)", this._onClickImage.bind(this));
    }

    async subRender(context, options) {
        await this._renderPageViews(context, options);
        if (this.syncState) this._syncPartState("pages", ...this.syncState);
        this.syncState = null;

        if (options.modeChanged || options.pageChanged) {
            if (this.isMultiple) this.goToPage(this.pageId, options);
            else if (options.anchor) this.getPageSheet(this.pageId)?.toc[options.anchor]?.element?.scrollIntoView();
        }

        // Search
        /*
        this.search ??= new foundry.applications.ux.SearchFilter({
            inputSelector: "search input",
            contentSelector: ".toc",
            callback: this._onSearchFilter.bind(this)
        });
        this.search.bind(this.trueElement);
        */
    }

    async _renderAppV1PageView(element, sheet) {
        const data = await sheet.getData();
        const view = await sheet._renderInner(data);
        element.replaceChildren(...view.get());
        sheet._activateCoreListeners(view.parent());
        sheet.activateListeners(view);
        sheet._callHooks("render", view, data);
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.mode = this.mode;
        context.viewMode = this.isMultiple
            ? { label: "JOURNAL.ModeMultiple", icon: "fas fa-notes", cls: "multi-page" }
            : { label: "JOURNAL.ModeSingle", icon: "fas fa-note", cls: "single-page" };
        return context;
    }

    _preparePageData() {
        const hasFilterQuery = this.search?.query;
        const levels = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
        const categoryMap = {};

        // Prepare pages.
        const uncategorized = this.entry.pages.contents.reduce((arr, page) => {
            if (!this.isPageVisible(page)) return arr;
            const { category, id, name, sort, title, type } = page;
            const hidden = hasFilterQuery && !this.filteredPages.has(page.id);
            const sheet = this.getPageSheet(page);
            const cssClasses = [type, `level${title.level}`, "page"];
            let editable = sheet.isEditable;
            if (!sheet.isV2 && !sheet.DEFAULT_OPTIONS) {
                editable = page.isOwner;
                if (page.parent.pack) editable &&= !game.packs.get(page.parent.pack)?.locked;
            }

            let defaultOwnership;
            if (page.ownership.default >= 0) {
                const [ownership] = levels.find(([, level]) => level === page.ownership.default);
                defaultOwnership = { icon: page.ownership.default == 0 ? 'fas fa-users-slash' : 'fas fa-users', tooltip: `${i18n("MonksEnhancedJournal.Everyone")}: ${i18n(`OWNERSHIP.${ownership}`)}`};
            }
            let userOwnerships = [];
            for (let [key, value] of Object.entries(page.ownership)) {
                let user = game.users.find(u => {
                    return u.id == key && !u.isGM;
                });
                if (user != undefined && value > 0 && value != page.ownership.default) {
                    const [ownership] = levels.find(([, level]) => level === value);
                    userOwnerships.push({ color: user.color, letter: user.name[0], tooltip: user.name + ': ' + i18n(`OWNERSHIP.${ownership}`) });
                }
            }

            const descriptor = {
                category, id, editable, hidden, name, sort, type, title,
                appendix: page.getFlag("monks-enhanced-journal", "appendix"),
                tocClass: cssClasses.join(" "),
                viewClass: cssClasses.concat(sheet.options.viewClasses || []).join(" "),
                defaultOwnership,
                userOwnerships
            };
            if (category && this.entry.categories.has(category)) {
                categoryMap[category] ??= [];
                categoryMap[category].push(descriptor);
            } else {
                descriptor.uncategorized = true;
                arr.push(descriptor);
            }
            return arr;
        }, []).sort((a, b) => a.sort - b.sort);

        // Order pages by category
        this.categorizedPages = {};
        const categories = this.entry.categories.contents.sort(JournalEntry.sortCategories);
        const categorized = categories.flatMap(({ id: categoryId }) => {
            const pages = (categoryMap[categoryId] ?? []).sort((a, b) => a.sort - b.sort);
            this.categorizedPages[categoryId] = pages.map(p => p.id);
            return pages;
        });

        let appendixAt = 'A';
        let pageAt = 1;

        function nextChar(c) {
            return String.fromCharCode(c.charCodeAt(0) + 1);
        }

        let pages = categorized.concat(uncategorized);
        return Object.fromEntries(pages.map((page, i) => {
            if (i == 0 && page.type == "image" && !page.title.show) {
                page.numberIcon = 'fa-image';
                page.numberTooltip = "Cover Image";
            } else if (page.type == "text" && !page.title.show && (i == 0 || (i == 1 && pages[0].numberIcon == "fa-image"))) {
                page.numberIcon = 'fa-list';
                page.numberTooltip = "Table of Contents";
            }

            if (!page.numberIcon) {
                let appendix = foundry.utils.getProperty(page, "appendix");
                page.number = (appendix ? appendixAt : pageAt++);
                if (appendix) {
                    page.numberTooltip = `Appendix ${appendixAt}`;
                    appendixAt = nextChar(appendixAt);
                }
            }
            return [page.id, page];
        }));
    }

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "pages": await this._preparePagesContext(context, options); break;
            case "sidebar": await this._prepareSidebarContext(context, options); break;
        }
        if (partId in this._pages) foundry.utils.mergeObject(context, this._pages[partId]);
        return context;
    }

    async _preparePagesContext(context, options) {
        if (this.isMultiple) context.pages = Object.values(this._pages);
        else context.pages = [this._pages[this.pageId]];
    }

    async _prepareSidebarContext(context, options) {
        context.toc = await this._prepareTableOfContents();
    }

    async _prepareTableOfContents() {
        if (!this.entry.categories.size) return Object.values(this._pages);
        const pages = { ...this._pages };
        const toc = [];
        for (const [categoryId, pageIds] of Object.entries(this.categorizedPages)) {
            const { id, name } = this.entry.categories.get(categoryId);
            toc.push({ id, name, isCategory: true });
            for (const pageId of pageIds) {
                toc.push(pages[pageId]);
                delete pages[pageId];
            }
        }
        if (!foundry.utils.isEmpty(pages)) {
            toc.push({
                id: "uncategorized",
                name: game.i18n.localize("JOURNAL.Uncategorized"),
                isCategory: true
            });
            toc.push(...Object.values(pages));
        }
        return toc;
    }

    _preSyncPartState(partId, newElement, priorElement, state) {
        super._preSyncPartState(partId, newElement, priorElement, state);
        if ((partId === "pages") || (partId in this._pages)) this.syncState = [newElement, priorElement, state];
    }

    _replaceHTML(result, content, options) {
        super._replaceHTML(result, content, options);
        const pagesPart = result.pages ?? content.querySelector('[data-application-part="pages"]');
        const container = pagesPart.querySelector(".journal-entry-pages");

        // If in multi-page mode, re-append all the elements so that they match the ordering of _pages.
        if (this.isMultiple) {
            for (const id of Object.keys(this._pages)) container.append(this.parts[id]);
        }

        // Otherwise just append the single page into the container.
        else {
            for (const id of options.parts) {
                if (id in this._pages) container.append(result[id]);
            }
        }

        // Delete the elements of any pages that were deleted or are no longer visible to this user.
        for (const id of Object.keys(this.parts)) {
            if (!(id in this._pages) && !(id in this.constructor.PARTS)) {
                this.parts[id].remove();
                delete this.parts[id];
            }
        }
    }

    async _renderHeadings(pageNode, toc) {
        const pageId = pageNode.dataset.pageId;
        const page = this.entry.pages.get(pageId);
        const tocNode = this.trueElement.querySelector(`.toc [data-page-id="${pageId}"]`);
        if (!tocNode || !toc) return;
        let headings = Object.values(toc);
        headings.sort((a, b) => a.order - b.order);
        if (page.title.show) headings.shift();
        const minLevel = Math.min(...headings.map(node => node.level));
        tocNode.querySelector(":scope > ol")?.remove();
        headings = headings.reduce((arr, { text, level, slug, element }) => {
            if (element) element.dataset.anchor = slug;
            if (level < minLevel + 2) arr.push({ text, slug, level: level - minLevel + 2 });
            return arr;
        }, []);
        const html = await foundry.applications.handlebars.renderTemplate("templates/journal/toc.hbs", { headings });
        tocNode.insertAdjacentHTML("beforeend", html);
    }

    async _renderPageViews(context, options) {
        for (const id of options.parts) {
            if (!(id in this._pages)) continue;
            const element = this.parts[id];
            if (!element) {
                ui.notifications.warn(`Failed to render JournalEntryPage [${id}]. No render target.`);
                continue;
            }
            const { editable, hidden, viewClass } = this._pages[id];
            element.hidden = hidden;
            element.className = `journal-entry-page ${viewClass}`;
            const sheet = this.getPageSheet(id);
            if (sheet.isV2 || sheet.DEFAULT_OPTIONS) await this._renderPageView(element, sheet);
            else {
                /** @deprecated since v13 until v16 */
                await this._renderAppV1PageView(element, sheet);
            }
            if (editable) element.insertAdjacentHTML("beforeend", `
        <div class="edit-container">
          <button type="button" class="icon fa-solid fa-pen-to-square" data-tooltip="JOURNAL.EditPage" data-action="editPage"
                  aria-label="${game.i18n.localize("JOURNAL.EditPage")}"></button>
        </div>
      `);
            await this._renderHeadings(element, sheet.toc);
        }
        this._observePages();
        this._observeHeadings();
    }

    async _renderPageView(element, sheet) {
        await sheet.render({ force: true });
        sheet.element.removeAttribute("class");
        element.append(sheet.element);
    }

    _setCurrentPage(options = {}) {
        let newPageId;
        options.pageChanged = ("pageIndex" in options) || ("pageId" in options);
        if (typeof options.pageIndex === "number") newPageId = Object.keys(this._pages)[options.pageIndex];
        if (options.pageId) newPageId = options.pageId;
        if ((newPageId != null) && (newPageId !== this.pageId)) {
            if (!this.isMultiple) this.callCloseHooks(this.pageId);
            this.pageId = newPageId;
        }
        if (!(this.pageId in this._pages)) [this.pageId] = Object.keys(this._pages);
    }

    _synchronizeSidebar() {
        const entries = Array.from(this.headingIntersections.values()).sort((a, b) => {
            return a.intersectionRect.y - b.intersectionRect.y;
        });
        for (const entry of entries) {
            const { pageId } = entry.target.closest("[data-page-id]")?.dataset ?? {};
            const anchor = entry.target.dataset.anchor;
            let toc = this.trueElement.querySelector(`.toc [data-page-id="${pageId}"]`);
            if (anchor) toc = toc.querySelector(`li[data-anchor="${anchor}"]`);
            if (toc) {
                toc.scrollIntoView();
                break;
            }
        }
    }

    _updateButtonState() {
        if (!this.enhancedjournal.rendered) return;
        const previous = this.enhancedjournal.element.querySelector('[data-action="previousPage"]');
        const next = this.enhancedjournal.element.querySelector('[data-action="nextPage"]');
        if (!next || !previous) return;
        if (this.isMultiple) {
            $(previous).toggleClass("disabled", !this.pagesInView[0]?.previousElementSibling);
            $(next).toggleClass("disabled", this.pagesInView.length && !this.pagesInView.at(-1).nextElementSibling);
        } else {
            const index = this.pageIndex;
            $(previous).toggleClass("disabled", index < 1);
            $(next).toggleClass("disabled", index >= Object.keys(this._pages).length - 1);
        }
    }

    _tearDown(options) {
        super._tearDown(options);
        this.search?.unbind();
    }

    _attachFrameListeners() {
        super._attachFrameListeners();
        this.trueElement.addEventListener("click", this._onClickImage.bind(this), { passive: true });
    }

    _observeHeadings() {
        this.headingIntersections = new Map();
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) this.headingIntersections.set(entry.target, entry);
            else this.headingIntersections.delete(entry.target);
        }), {
            root: this.trueElement.querySelector(".journal-entry-pages"),
            threshold: 1
        });
        const headings = Array.fromRange(6, 1).map(n => `h${n}`).join(",");
        this.trueElement.querySelectorAll(`.journal-entry-page :is(${headings})`).forEach(observer.observe, observer);
    }

    _observePages() {
        this.#pagesInView = [];
        this.#observer = new IntersectionObserver((entries, observer) => {
            this._onPageScroll(entries, observer);
            this._activatePagesInView();
            this._updateButtonState();
        }, {
            root: this.trueElement.querySelector(".journal-entry-pages"),
            threshold: [0, .25, .5, .75, 1]
        });
        this.trueElement.querySelectorAll(".journal-entry-page").forEach(this.observer.observe, this.observer);
    }

    _onClickImage(event) {
        if (!event.target.matches("img:not(.nopopout)")) return;
        const target = event.target;
        const imagePage = target.closest(".journal-entry-page.image");
        const page = this.entry.pages.get(imagePage?.dataset.pageId);
        const title = page?.name ?? target.title;
        const ip = new foundry.applications.apps.ImagePopout({
            src: target.getAttribute("src"),
            caption: page?.image.caption,
            window: { title }
        });
        if (page) ip.shareImage = () => Journal.showDialog(page);
        ip.render({ force: true });
    }

    /*
    _onClose(options) {
        super._onClose(options);
        for (const sheet of Object.values(this.sheets)) sheet.close({ animate: false });

        // Reset any temporarily-granted ownership.
        if (!this.tempOwnership) return;
        this.entry.ownership = foundry.utils.deepClone(this.entry._source.ownership);
        this.entry.pages.forEach(p => p.ownership = foundry.utils.deepClone(p._source.ownership));
        this.tempOwnership = false;
    }
    */

    static onConfigureCategories() {
        new foundry.applications.sheets.journal.JournalEntryCategoryConfig({ document: this.entry }).render({ force: true });
    }

    _onContextMenuClose(target) {
        if (this.sidebarState.active) target.classList.add("active");
        this.trueElement.querySelector(".toc").scrollTop = this.sidebarState.position;
    }

    _onContextMenuOpen(target) {
        this.sidebarState.position = this.trueElement.querySelector(".toc").scrollTop;
        this.sidebarState.active = target.classList.contains("active");
        target.classList.remove("active");
    }

    static onEditObservedPage(event, target) {
        const page = this.entry.pages.get(this.#pageId);
        return page?.sheet.render(true);
    }

    static onEditPage(event, target) {
        const { pageId } = target.closest("[data-page-id]").dataset;
        const page = this.entry.pages.get(pageId);
        return page?.sheet.render(true);
    }

    static onGoToHeading(event, target) {
        if (event.button !== 0) return;
        const { pageId } = target.closest("[data-page-id]").dataset;
        const { anchor } = target.closest("[data-anchor]")?.dataset ?? {};
        this.goToPage(pageId, { anchor });
    }

    _onPageScroll(entries, observer) {
        if (!entries.length) return;

        // This has been triggered by an old IntersectionObserver from the previous render and is no longer relevant.
        if (observer !== this.observer) return;

        // Case 1 - We are in single page mode.
        if (!this.isMultiple) {
            const entry = entries[0]; // There can be only one entry in single page mode.
            if (entry.isIntersecting) this.#pagesInView = [entry.target];
            return;
        }

        const minRatio = JournalEntrySheet.INTERSECTION_RATIO;
        const intersecting = entries
            .filter(entry => entry.isIntersecting && (entry.intersectionRatio >= minRatio))
            .sort((a, b) => a.intersectionRect.y - b.intersectionRect.y);

        // Special case where the page is so large that any portion of visible content is less than 25% of the whole page.
        if (!intersecting.length) {
            const isIntersecting = entries.find(entry => entry.isIntersecting);
            if (isIntersecting) intersecting.push(isIntersecting);
        }

        // Case 2 - We are in multiple page mode and this is the first render.
        if (!this.pagesInView.length) {
            this.#pagesInView = intersecting.map(entry => entry.target);
            return;
        }

        // Case 3 - The user is scrolling normally through pages in multiple page mode.
        const byTarget = new Map(entries.map(entry => [entry.target, entry]));
        const inView = new Set(this.pagesInView);

        // Remove pages that have scrolled out of view.
        for (const el of this.pagesInView) {
            const entry = byTarget.get(el);
            if (entry && (entry.intersectionRatio < minRatio)) inView.delete(el);
        }

        // Add pages that have scrolled into view.
        for (const entry of intersecting) inView.add(entry.target);

        this.#pagesInView = Array.from(inView).sort((a, b) => {
            const pageA = this.entry.pages.get(a.dataset.pageId);
            const pageB = this.entry.pages.get(b.dataset.pageId);
            if (pageA.category == pageB.category)
                return pageA.sort - pageB.sort;
            else {
                // category null always goes last, otherwise use this.entry.categories sort order
                const categoryASort = pageA.category ? this.entry.categories.get(pageA.category)?.sort : 99999999999;
                const categoryBSort = pageB.category ? this.entry.categories.get(pageB.category)?.sort : 99999999999;
                return categoryASort - categoryBSort;
            }
        });
    }

    _onRevealSecret(event) {
        const { pageId } = event.target.closest("[data-page-id]")?.dataset ?? {};
        const page = this.document.pages.get(pageId);
        if (!page) return;
        const content = page.text.content;
        const modified = event.target.toggleRevealed(content);
        page.update({ "text.content": modified });
    }

    /*
    searchText(query) {
        this.filteredPages.clear();
        const nameOnlySearch = this.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME;

        // Match pages
        let results = [];
        if (!nameOnlySearch) results = this.entry.pages.search({ query });
    }

    _onSearchFilter(event, query, rgx, html) {
        this.filteredPages.clear();
        const nameOnlySearch = this.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME;

        // Match pages
        let results = [];
        if (!nameOnlySearch) results = this.entry.pages.search({ query });
        for (const el of html.querySelectorAll("[data-page-id]")) {
            const page = this.entry.pages.get(el.dataset.pageId);
            let match = !query;
            if (!match && nameOnlySearch) match = foundry.applications.ux.SearchFilter.testQuery(rgx, page.name);
            else if (!match) match = results.find(r => r._id === page.id);
            if (match) this.filteredPages.add(page.id);
            el.hidden = !match;
        }
    }*/

    static async onToggleLock() {
        let locked = !this.locked;
        await this.document.setFlag("core", "locked", locked);

        const button = $(".lock", this.enhancedjournal.element).get(0);
        button.dataset.tooltip = locked ? "JOURNAL.LockModeLocked" : "JOURNAL.LockModeUnlocked";
        const i = button.children[0];
        i.setAttribute("class", `fa-solid ${locked ? "fa-lock" : "fa-unlock"}`);
    }

    static onToggleMode() {
        const { MULTIPLE, SINGLE } = this.constructor.VIEW_MODES;
        this.#mode = this.isMultiple ? SINGLE : MULTIPLE;
        game.user.setFlag("monks-enhanced-journal", `pagestate.${this.document.id}.mode`, this.mode);
        this.render();
    }

    static createPageDialog(event, target) {
        const { bottom, left } = this.trueElement.getBoundingClientRect();
        const sort = (Object.values(this._pages).at(-1)?.sort ?? 0) + CONST.SORT_INTEGER_DENSITY;
        const categories = [
            { value: "", label: "JOURNAL.Uncategorized", rule: true },
            ...this.document.categories.map(cat => {
                return { ...cat, label: cat.name, value: cat.id };
            }).sort(this.document.constructor.sortCategories)
        ];
        return JournalEntryPage.implementation.createDialog({ sort }, { parent: this.entry }, {
            template: "templates/journal/pages/create-dialog.hbs",
            context: {
                categories: {
                    options: categories,
                    show: this.document.categories.size
                },
                fields: {
                    category: new foundry.data.fields.StringField({ label: "JOURNALENTRYPAGE.Category" }, { name: "category" }),
                    name: new foundry.data.fields.StringField({ required: true, blank: false, label: "Name" }, { name: "name" }),
                    type: new foundry.data.fields.StringField({ required: true, blank: false, label: "Type" }, { name: "type" })
                }
            },
            position: {
                width: 320,
                top: bottom - 200,
                left: left + 10
            }
        });
    }

    getPageSheet(page) {
        if (typeof page === "string") page = this.entry.pages.get(page);
        const sheetClass = page._getSheetClass();
        let sheet = this.sheets[page.id];
        if (sheet?.constructor !== sheetClass) {
            if (sheetClass.isV2 || sheetClass.DEFAULT_OPTIONS) sheet = new sheetClass({
                id: "{id}-view",
                tag: "div",
                document: page,
                mode: "view",
                window: {
                    frame: false,
                    positioned: false
                }
            });
            else {
                /** @deprecated since v13 until v16. */
                sheet = new sheetClass(page, { editable: false });
            }
            this.sheets[page.id] = sheet;
        }
        return sheet;
    }

    goToPage(pageId, { anchor } = {}) {
        if (!this.isMultiple && (pageId !== this.pageId)) return this.render({ pageId, anchor });
        const page = this.trueElement.querySelector(`.journal-entry-page[data-page-id="${pageId}"]`);
        if (anchor) {
            const { element } = this.getPageSheet(pageId)?.toc[anchor] ?? {};
            if (element) {
                element.scrollIntoView();
                return;
            }
        }
        page?.scrollIntoView();
    }

    isPageVisible(page) {
        const sheet = this.getPageSheet(page);
        return sheet.isVisible ?? sheet._canUserView(game.user);
    }

    static nextPage() {
        if (!this.isMultiple) return this.render({ pageIndex: this.pageIndex + 1 });
        if (this.pagesInView.length) this.pagesInView.at(-1).nextElementSibling?.scrollIntoView();
        else this.trueElement.querySelector(".journal-entry-page")?.scrollIntoView();
    }

    static previousPage() {
        if (!this.isMultiple) return this.render({ pageIndex: this.pageIndex - 1 });
        this.pagesInView[0]?.previousElementSibling?.scrollIntoView();
    }

    static toggleSearchMode() {
        const { FULL, NAME } = CONST.DIRECTORY_SEARCH_MODES;
        this.#searchMode = this.searchMode === NAME ? FULL : NAME;
        return this.render();
    }

    static toggleSidebar() {
        const sidebar = this.trueElement.querySelector(".sidebar");
        const button = $(".collapse-sidebar", this.enhancedjournal.element).get(0);
        this.sidebarState.expanded = !this.sidebarExpanded;
        game.user.setFlag("monks-enhanced-journal", `pagestate.${this.document.id}.expanded`, this.sidebarState.expanded);

        // Disable application interaction temporarily.
        this.trueElement.style.pointerEvents = "none";

        // Remove min-width temporarily.
        const minWidth = this.trueElement.style.minWidth || "";
        this.trueElement.style.minWidth = "unset";

        // Configure CSS transitions.
        this.trueElement.classList.add("collapsing");
        this._awaitTransition(this.trueElement, 1000).then(() => {
            this.trueElement.style.pointerEvents = "";
            this.trueElement.style.minWidth = minWidth;
            this.trueElement.classList.remove("collapsing");
        });

        // Toggle display of the sidebar.
        this.trueElement.classList.toggle("expanded", this.sidebarExpanded);

        // Update icons and labels.
        button.dataset.tooltip = this.sidebarExpanded ? "JOURNAL.ViewCollapse" : "JOURNAL.ViewExpand";
        button.ariaLabel = game.i18n.localize(button.dataset.tooltip);
        game.tooltip.deactivate();
    }

    _canDragDrop(selector) {
        return this.isEditable;
    }

    _canDragStart(selector) {
        return this.entry.testUserPermission(game.user, "OBSERVER");
    }

    _onDragStart(event) {
        ui.context?.close({ animate: false });
        const target = event.currentTarget;
        const { pageId } = target.closest("[data-page-id]").dataset;
        const { anchor } = target.closest("[data-anchor]")?.dataset ?? {};
        const page = this.entry.pages.get(pageId);
        const dragData = {
            ...page.toDragData(),
            anchor: { slug: anchor, name: target.innerText }
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _onDrop(event) {
        // Retrieve the dropped Journal Entry Page.
        const data = TextEditor.implementation.getDragEventData(event);
        const page = await JournalEntryPage.implementation.fromDropData(data);
        if (!page) return;

        // Determine the target that was dropped.
        const target = event.target.closest("[data-page-id]");
        const sortTarget = target ? this.entry.pages.get(target?.dataset.pageId) : null;

        // Prevent dropping a page onto itself.
        if (page === sortTarget) return;

        // Case 1 - Sort Pages
        if (page.parent === this.entry) {
            if (this.locked) return;
            return page.sortRelative({
                sortKey: "sort",
                target: sortTarget,
                siblings: this.entry.pages.filter(p => p.id !== page.id)
            });
        }

        // Case 2 - Create Pages
        const pageData = page.toObject();
        if (this.entry.pages.has(page.id)) delete pageData._id;
        pageData.sort = sortTarget ? sortTarget.sort : this.entry.pages.reduce((max, p) => {
            return p.sort > max ? p.sort : max;
        }, -CONST.SORT_INTEGER_DENSITY);
        pageData.sort += CONST.SORT_INTEGER_DENSITY;
        return JournalEntryPage.implementation.create(pageData, { parent: this.entry, keepId: true });
    }

    callCloseHooks(pageId) {
        if (foundry.utils.isEmpty(this._pages)) return;
        const pages = pageId ? [this._pages[pageId]] : Object.values(this._pages);
        for (const page of pages) {
            const sheet = this.getPageSheet(page.id);
            if (sheet.isV2 || sheet.DEFAULT_OPTIONS) sheet._doEvent(sheet._onCloseView, { eventName: "closeView", hookName: "closeView" });
            else {
                sheet._callHooks("close", sheet.element);
                sheet._closeView?.();
            }
        }
    }
}
