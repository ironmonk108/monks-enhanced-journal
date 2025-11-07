import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { ListItemEdit } from "../apps/list-item-edit.js";
import { ListFolderEdit } from "../apps/list-folder-edit.js";

export class ListSheet extends EnhancedJournalSheet {
    constructor(options) {
        super(options);

        this._expand = {};
    }

    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.list",
            icon: "fa-solid fa-list",
        },
        actions: {
            convertSheet: ListSheet.convertSheet,
            itemChecked: ListSheet.onCheckItem,
            clearVote: ListSheet.onClearVote,
            vote: ListSheet.onVote,
            toggleBar: ListSheet.onToggleBar,
            updateProgress: ListSheet.onUpdateProgress,
            createFolder: ListSheet.onCreateFolder,
            createItem: ListSheet.onCreateItem,
            editItem: ListSheet.onEditItem,
            toggleFolder: ListSheet.onToggleFolder,
            collapseAll: ListSheet.onCollapseAll
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/list.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-header.hbs",
            ],
            scrollable: [".list-list"],
        }
    };

    #search = new foundry.applications.ux.SearchFilter({
        inputSelector: "input.searchList",
        contentSelector: ".list-list",
        callback: this._onSearchFilter.bind(this)
    });

    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        parts.main.templates.push(`modules/monks-enhanced-journal/templates/sheets/partials/list-template-${this.subtype}.html`);
        return parts;
    }

    static get type() {
        return 'list';
    }

    get subtype() {
        return this.document.getFlag("monks-enhanced-journal", "subtype", "basic");
    }

    static get defaultObject() {
        return { entries: [], folders: [] };
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        let items = this.document.getFlag('monks-enhanced-journal', 'items');
        let entries = items;
        if (!(items instanceof Array)) {
            entries = [];
            for (let [id, item] of Object.entries(items || {})) {
                item.id = id;
                entries.push(item);
            }
        }

        if (!this.document.getFlag('monks-enhanced-journal', 'entries') && items) {
            await this.document.setFlag('monks-enhanced-journal', 'entries', entries);
        }

        this.initialize();

        let tree = this.tree;
        if (this.subtype == "poll") {
            let calcPercent = function (folder) {
                let max = game.users.size;
                //+++ setting for max percentage based on total players or max votes.
                if (false) {
                    for (let item of folder.content) {
                        let count = parseInt(item.document.count || 0);
                        if (Number.isInteger(count))
                            max = Math.max(max, count);
                    }
                }

                for (let item of folder.content) {
                    let count = 0;
                    let against = 0;

                    item.voted = (item.document.players || {})[game.user.id] != undefined;

                    item.players = [];
                    for (let [key, value] of Object.entries(item.document.players || {}))
                    {
                        let user = game.users.get(key);
                        if (!user) continue;

                        if (value === false) against++;
                        else count++;

                        item.players.push({
                            color: user?.color,
                            letter: user?.name[0],
                            username: user?.name,
                            against: value === false
                        });
                    }

                    max += (item.document.votefor || 0) + (item.document.against || 0);
                    count += (item.document.votefor || 0);
                    against += (item.document.against || 0);

                    item.percent = count == 0 ? 0 : Math.clamp(count / max, 0, 1) * 100;
                    item.against = against == 0 ? 0 : Math.clamp(against / max, 0, 1) * 100;
                    item.votesFor = count;
                    item.votesAgainst = against;
                }

                for (let child of folder.children) {
                    calcPercent(child);
                }
            }

            calcPercent(tree);
        }
        else if (this.subtype == "progress") {
            let calcPercent = function (folder) {
                for (let entry of folder.content) {
                    let count = parseInt(entry.document.count || 0);
                    let max = parseInt(entry.document.max);
                    if (!Number.isInteger(max)) {
                        entry.noprogress = true;
                    } else {
                        entry.noprogress = false;
                        entry.percent = (count / max) * 100;
                        entry.valueText = `${count}/${max}`;
                    }
                }

                for (let child of folder.children) {
                    calcPercent(child);
                }
            }

            calcPercent(tree);
        }

        context.placeholder = "MonksEnhancedJournal.List";

        let listFolders = game.user.getFlag('monks-enhanced-journal', 'list-folders') || {}
        return foundry.utils.mergeObject(context, {
            listtype: "basic",
            documentPartial: `modules/monks-enhanced-journal/templates/sheets/partials/list-template-${this.subtype}.html`,
            tree,
            folders: listFolders[this.document.id] || {},
            canCreate: this.document.isOwner,
            allowAgainst: setting("allow-poll-against") && this.subtype == "poll",
        });
    }

    initialize() {
        let idx = 0;
        this.folders = (this.document?.flags['monks-enhanced-journal']?.folders || []).map(f => { if (f.parent == '') f.parent = null; return { id: f.id, name: f.name, document: f, sort: idx++ }; });
        idx = 0;
        this.entries = (this.document?.flags['monks-enhanced-journal']?.entries || []).map(i => { return { id: i.id, document: i, sort: idx++ }; });
        // Build Tree
        this.tree = this.constructor.setupFolders(this.folders, this.entries);
    }

    async _render(force = false, options = {}) {
        if (options.reload)
            this.initialize();
        super._render(force, options);
    }

    _documentControls() {
        let ctrls = [
            { id: 'show', label: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fas fa-eye', visible: game.user.isGM, action: "showPlayers" },
            { id: 'convert', label: i18n("MonksEnhancedJournal.Convert"), icon: 'fas fa-clipboard-list', visible: (game.user.isGM && this.isEditable), action: "convertSheet" }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    _disableFields(form) {
        super._disableFields(form);

        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (hasGM)
            $(`.vote-button`, form).removeAttr('disabled').removeAttr('readonly');
    }

    get canPlaySound() {
        return false;
    }

    static async convertSheet(event, target) {
        let context = {
            options: [
                { id: "basic", name: "MonksEnhancedJournal.list.basic", disabled: this.subtype == "basic" },
                { id: "checklist", name: "MonksEnhancedJournal.list.checklist", disabled: this.subtype == "checklist" },
                { id: "poll", name: "MonksEnhancedJournal.list.poll", disabled: this.subtype == "poll" },
                { id: "progress", name: "MonksEnhancedJournal.list.progress", disabled: this.subtype == "progress" },
            ],
            sheetType: i18n(`MonksEnhancedJournal.list.${this.subtype}`)
        };
        let html = await foundry.applications.handlebars.renderTemplate("modules/monks-enhanced-journal/templates/convert.html", context);
        let that = this;
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: `Convert List`,
            },
            content: html,
            yes: {
                callback: (event, button) => {
                    const form = button.form;
                    const fd = new foundry.applications.ux.FormDataExtended(form).object;

                    that.document.setFlag('monks-enhanced-journal', 'subtype', fd.convertTo);
                }
            }
        });
    }

    static setupFolders(folders, documents) {
        //documents = documents.filter(d => d.visible);
        const depths = [];
        const handled = new Set();

        // Iterate parent levels
        const root = { id: null };
        let batch = [root];
        for (let i = 0; i < CONST.FOLDER_MAX_DEPTH; i++) {
            depths[i] = [];
            for (let folder of batch) {
                if (handled.has(folder.id)) continue;

                // Classify content for this folder
                try {
                    [folders, documents] = this._populate(folder, folders, documents);

                } catch (err) {
                    console.error(err);
                    continue;
                }

                // Add child folders to the correct depth level
                depths[i] = depths[i].concat(folder.children);
                folder.depth = i;
                handled.add(folder.id);
            }
            batch = depths[i];
        }

        // Populate content to any remaining folders and assign them to the root level
        const remaining = depths[CONST.FOLDER_MAX_DEPTH - 1].concat(folders);
        for (let f of remaining) {
            [folders, documents] = this._populate(f, folders, documents, { allowChildren: false });
        }
        depths[0] = depths[0].concat(folders);

        // Filter folder visibility
        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        for (let i = CONST.FOLDER_MAX_DEPTH - 1; i >= 0; i--) {
            depths[i] = depths[i].reduce((arr, f) => {
                f.children = f.children.filter(c => {
                    let ownership = c.ownership || { default: ownershipLevels.OBSERVER };
                    return game.user.isGM || ownership?.default >= ownershipLevels.LIMITED || ownership[game.user.id] >= ownershipLevels.LIMITED;
                });
                //let ownership = f.ownership || {};
                //if (!(game.user.isGM || f.ownership?.default >= ownershipLevels.LIMITED || f.ownership[game.user.id] >= ownershipLevels.LIMITED)) return arr;
                f.depth = i + 1;
                arr.push(f);
                return arr;
            }, []);
        }

        // Return the root level contents of folders and documents
        return {
            root: true,
            content: root.content.concat(documents),
            children: depths[0]
        };
    }

    static _populate(folder, folders, documents, { allowChildren = true } = {}) {
        const id = folder.id;

        // Define sorting function for this folder
        const s = (a, b) => a.sort - b.sort;

        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        // Partition folders into children and unassigned folders
        let [u, children] = folders
            .partition((f) => {
                return allowChildren && (f.document?.parent === id || (f.document?.parent == undefined && id == null))
            });
        folder.children = children.sort((a, b) => a.name.localeCompare(b.name));
        folders = u;

        // Partition documents into contents and unassigned documents
        const [docs, content] = documents
            .filter((e) => {
                let ownership = e.document.ownership || { default: ownershipLevels.OBSERVER };
                return game.user.isGM || ownership?.default >= ownershipLevels.LIMITED || ownership[game.user.id] >= ownershipLevels.LIMITED;
            })
            .partition((e) => {
                return e.document?.folder === id || (e.document?.folder == undefined && id == null)
            });
        folder.content = content.sort((a, b) => a.sort - b.sort);
        documents = docs;

        // Return the remainder
        return [folders, documents];
    }

    _onSearchFilter(event, query, rgx, html) {
        const isSearch = !!query;
        let documentIds = new Set();
        let folderIds = new Set();

        // Match documents and folders
        if ( isSearch ) {

            // Match document names
            for (let d of this.entries ) {
                if ((d.document.text && rgx.test(foundry.applications.ux.SearchFilter.cleanQuery(d.document.text))) || (d.document.title && rgx.test(foundry.applications.ux.SearchFilter.cleanQuery(d.document.title)) )) {
                    documentIds.add(d.id);
                    if (d.document.folder) folderIds.add(d.document.folder);
                }
            }

            // Match folder tree
            const includeFolders = fids => {
                const folders = this.folders.filter(f => fids.has(f.id));
                const pids = new Set(folders.filter(f => f.document.parent).map(f => f.document.parent));
                if ( pids.size ) {
                    pids.forEach(p => folderIds.add(p));
                    includeFolders(pids);
                }
            };
            includeFolders(folderIds);
        }

        // Toggle each directory entry
        let listFolders = foundry.utils.duplicate(game.user.getFlag('monks-enhanced-journal', 'list-folders') || {});
        let folders = listFolders[this.document.id] || {};
        for ( let el of html.querySelectorAll(".list-item") ) {

            // Entities
            if (el.classList.contains("document")) {
                el.style.display = (!isSearch || documentIds.has(el.dataset.documentId)) ? "flex" : "none";
            }

            // Folders
            if (el.classList.contains("folder")) {
                let match = isSearch && folderIds.has(el.dataset.folderId);
                el.style.display = (!isSearch || match) ? "flex" : "none";
                if (isSearch && match) el.classList.remove("expanded");
                else el.classList.toggle("expanded", folders[el.dataset.folderId]);
            }
        }
     }

    static onCollapseAll(event, target) {
        $(target).closest("form").find('li.folder').removeClass("expanded");
        let listFolders = foundry.utils.duplicate(game.user.getFlag('monks-enhanced-journal', 'list-folders') || {});
        delete listFolders[this.document.id];
        game.user.setFlag('monks-enhanced-journal', 'list-folders', listFolders);
    }

    _dragDrop(html) {
        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".list-item",
            dropSelector: ".list-list",
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

    async activateListeners(html) {
        await super.activateListeners(html);

        this.#search.bind(html);

        // Folder-level events
        $(".folder .folder .folder .create-folder", html).remove(); // Prevent excessive folder nesting

        // Entry-level events
        const dh = this._onDragHighlight.bind(this);
        $(".folder", html).on("dragenter", dh).on("dragleave", dh);
    }

    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = super._prepareSubmitData(event, form, formData, updateData);

        if (this.subtype == "progress") {
            if (submitData.max != "" && submitData.max != undefined) {
                submitData.max = parseInt(submitData.max);
            }
            if (submitData.count != "" && submitData.count != undefined) {
                submitData.count = parseInt(submitData.count);
                if (submitData.max != "" && submitData.max != undefined)
                    submitData.count = Math.clamp(submitData.count, 0, submitData.max);
            }

        } else if (this.subtype == "poll") {
            if (submitData.count != "" && submitData.count != undefined) {
                submitData.count = parseInt(submitData.count);
            }
        }

        return submitData;
    }

    static async onEditItem(event, target) {
        let id = event.currentTarget.closest("li.document").dataset.documentId;
        const entry = this.entries.find(i => i.id == id);
        if (!entry) return;

        new ListItemEdit({ document: entry.document, sheet: this }).render(true);
    }

    static async onCreateItem(event, target) {
        let folderId = target.closest("li.folder")?.dataset?.folderId;
        new ListItemEdit({ folder: folderId, sheet: this }).render(true, { focus: true });
    }

    static async onEditFolder(event, target) {
        let id = event.currentTarget.closest("li.document").dataset.documentId;
        const entry = this.entries.find(i => i.id == id);
        if (!entry) return;

        new ListFolderEdit({ document: entry.document, sheet: this }).render(true);
    }

    static async onCreateFolder(event, target) {
        let folderId = target.closest("li.folder")?.dataset?.folderId;
        new ListFolderEdit({ folder: folderId, sheet: this }).render(true, { focus: true });
    }

    static async onToggleFolder(event, target) {
        let elem = $(target.parentElement);
        let expanded = elem.hasClass("expanded");
        let listFolders = foundry.utils.duplicate(game.user.getFlag('monks-enhanced-journal', 'list-folders') || {});
        let folders = listFolders[this.document.id] || {};
        let id = elem[0].dataset.folderId;
        folders[id] = !expanded;

        elem.toggleClass("expanded", !expanded);

        listFolders[this.document.id] = folders;
        await game.user.setFlag('monks-enhanced-journal', 'list-folders', listFolders);
    }

    _onDragStart(event) {
        let li = event.currentTarget.closest(".list-item");
        if (li) {
            const isFolder = li.classList.contains("folder");
            const dragData = isFolder ?
                { type: "Folder", id: li.dataset.folderId } :
                { type: "ListItem", id: li.dataset.documentId, uuid: `${this.document.uuid}.Item.${li.dataset.documentId}` };
            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
            this._dragType = dragData.type;
        }
    }

    _canDragStart(selector) {
        return this.document.isOwner;
    }

    _onDragHighlight(event) {
        const li = event.currentTarget;
        if (!li.classList.contains("folder")) return;
        event.stopPropagation();  // Don't bubble to parent folders

        // Remove existing drop targets
        if (event.type === "dragenter") {
            for (let t of li.closest(".list-list").querySelectorAll(".droptarget")) {
                t.classList.remove("droptarget");
            }
        }

        // Remove current drop target
        if (event.type === "dragleave") {
            const el = document.elementFromPoint(event.clientX, event.clientY);
            const parent = el.closest(".folder");
            if (parent === li) return;
        }

        // Add new drop target
        li.classList.toggle("droptarget", event.type === "dragenter");
    }

    _onDrop(event) {
        // Try to extract the data
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        // Identify the drop target
        const target = event.target.closest(".list-item") || null;

        // Call the drop handler
        switch (data.type) {
            case "Folder":
                return this._handleDroppedFolder(target, data);
            case "ListItem":
                return this._handleDroppedDocument(target, data);
        }
    }

    async _handleDroppedDocument(target, data) {
        let entries = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal'].entries || []);
        // Determine the closest folder ID
        const closestFolder = target ? target.closest(".folder") : null;
        if (closestFolder) closestFolder.classList.remove("droptarget");
        const closestFolderId = closestFolder ? closestFolder.dataset.folderId : null;

        // Obtain the dropped document
        const entry = entries.find(i => i.id == data.id);
        if (!entry) return;

        let from = entries.findIndex(a => a.id == data.id);
        let to = entries.length - 1; //if there's no target then add to the end of the root

        if (target == undefined)
            delete entry.folder;
        else {
            if (data.id === target.dataset.documentId) return; // Don't drop on yourself

            if ($(target).hasClass('folder')) {
                //if this is dropping on a folder then add to the end of a folder
                let folderItems = entries.filter(i => i.folder == target.dataset.folderId);
                if(folderItems.length)
                    to = entries.findIndex(a => a.id == folderItems[folderItems.length - 1]);
                entry.folder = target.dataset.folderId;
            } else {
                //if this is dropping on an item...
                if (entry.folder != closestFolderId)
                    entry.folder = closestFolderId;
                to = entries.findIndex(a => a.id == target.dataset.documentId);
            }
        }

        if (from != to)
            entries.splice(to, 0, entries.splice(from, 1)[0]);
        await this.document.setFlag('monks-enhanced-journal', 'entries', entries);
    }

    async _handleDroppedFolder(target, data) {
        let folders = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal'].folders || []);

        // Determine the closest folder ID
        const closestFolder = target ? target.closest(".folder") : null;
        if (closestFolder) closestFolder.classList.remove("droptarget");
        const closestFolderId = closestFolder ? closestFolder.dataset.folderId : null;

        // Obtain the dropped document
        const folder = folders.find(i => i.id == data.id);
        if (!folder) return;

        let from = folders.findIndex(a => a.id == data.id);
        let to = folders.length - 1; //if there's no target then add to the end of the root

        if (target == undefined)
            delete folder.parent;
        else {
            if (data.id === target.dataset.folderId) return; // Don't drop on yourself

            folder.parent = closestFolderId;
            /*
            //if the target shares the same parent
            if (folder.parent == closestFolderId) {
                if ($(target).hasClass('folder')) {
                    to = folders.findIndex(a => a.id == target.dataset.folderId);
                }
            } else {
                //else change parent and add to the bottom of the new folder
                folder.parent = closestFolderId;
            }*/
        }

        if (from != to)
            folders.splice(to, 0, folders.splice(from, 1)[0]);

        await this.document.setFlag('monks-enhanced-journal', 'folders', folders);
    }

    async _deleteFolder(folder, options, userId) {
        let folders = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal']?.folders || []);
        let entries = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal']?.entries || []);
        const parentId = folder.document.parent || null;
        const { deleteSubfolders, deleteContents } = options;

        let getSubfolders = function(id, recursive = false) {
            let subfolders = folders.filter(f => f.parent === id);
            if (recursive && subfolders.length) {
                for (let f of subfolders) {
                    const children = getSubfolders(f.id, true);
                    subfolders = subfolders.concat(children);
                }
            }
            return subfolders;
        }

        // Delete or move sub-Folders
        const deleteFolderIds = [folder.id];
        for (let f of getSubfolders(folder.id)) {
            if (deleteSubfolders) deleteFolderIds.push(f.id);
            else f.parent = parentId;
        }
        for (let f of deleteFolderIds)
            folders.findSplice(i => i.id === f);

        // Delete or move contained Documents
        const deleteDocumentIds = [];
        for (let d of entries) {
            if (!deleteFolderIds.includes(d.folder)) continue;
            if (deleteContents) deleteDocumentIds.push(d.id);
            else d.folder = parentId;
        }
        for (let d of deleteDocumentIds)
            entries.findSplice(i => i.id === d);

        await this.document.setFlag('monks-enhanced-journal', 'folders', folders);
        await this.document.setFlag('monks-enhanced-journal', 'entries', entries);
    }

    _contextMenu(html) {

        // Folder Context
        const folderOptions = this._getFolderContextOptions();

        // Entity Context
        const entryOptions = this._getEntryContextOptions();

        // Create ContextMenus
        if (folderOptions) new foundry.applications.ux.ContextMenu(html, ".folder .folder-header", folderOptions, { fixed: true, jQuery: false });
        if (entryOptions) new foundry.applications.ux.ContextMenu(html, ".document", entryOptions, { fixed: true, jQuery: false });
    }

    _getFolderContextOptions() {
        let that = this;
        return [
            {
                name: "FOLDER.Edit",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM || this.document.isOwner,
                callback: header => {
                    const li = header.parentNode;
                    const folder = that.folders.find(i => i.id == li.dataset.folderId);
                    if (!folder) return;

                    new ListFolderEdit({ document: folder, sheet: that }).render(true);
                }
            },
            {
                name: "FOLDER.Remove",
                icon: '<i class="fas fa-trash"></i>',
                condition: game.user.isGM || this.document.isOwner,
                callback: header => {
                    const li = header.parentNode;
                    const folder = that.folders.find(f => f.id == li.dataset.folderId);
                    return foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: `${game.i18n.localize("FOLDER.Remove")} ${folder?.document?.name}`,
                        },
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.localize("FOLDER.RemoveWarning")}</p>`,
                        yes: {
                            callback: () => that._deleteFolder(folder, { deleteSubfolders: false, deleteContents: false }),
                        },
                        position: {
                            top: Math.min(li.offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720,
                            width: 400
                        }
                    });
                }
            },
            {
                name: "FOLDER.Delete",
                icon: '<i class="fas fa-dumpster"></i>',
                condition: game.user.isGM || this.document.isOwner,
                callback: header => {
                    const li = header.parentNode;
                    const folder = that.folders.find(f => f.id == li.data("folderId"));
                    return foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: `${game.i18n.localize("FOLDER.Delete")} ${folder?.document?.name}`,
                        },
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.localize("FOLDER.DeleteWarning")}</p>`,
                        yes: {
                            callback: () => that._deleteFolder(folder, { deleteSubfolders: true, deleteContents: true }),
                        },
                        position: {
                            top: Math.min(li.offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720,
                            width: 400
                        }
                    });
                }
            }
        ];
    }

    _getEntryContextOptions() {
        let that = this;
        return [
            {
                name: i18n("MonksEnhancedJournal.EditItem"),
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM || this.document.isOwner,
                callback: async (li) => {
                    const entry = that.entries.find(i => i.id == li.dataset.documentId);
                    if (!entry) return;

                    new ListItemEdit({ document: entry.document, sheet: that }).render(true);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM || this.document.isOwner,
                callback: li => {
                    const entry = that.entries.find(i => i.id == li.dataset.documentId);
                    if (!entry) return;
                    return foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: i18n("MonksEnhancedJournal.DeleteItem"),
                        },
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.format("SIDEBAR.DeleteWarning", { type: "List Item" })}</p>`,
                        yes: {
                            callback: () => {
                                let entries = (that.document.flags['monks-enhanced-journal'].entries || []);
                                entries.findSplice(i => i.id === entry.id);
                                that.document.setFlag('monks-enhanced-journal', 'entries', entries);
                            },
                        },
                        position: {
                            top: Math.min(li.offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720,
                            width: 400
                        }
                    });
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM || this.document.isOwner,
                callback: li => {
                    let entries = (that.document.flags['monks-enhanced-journal'].entries || []);
                    const original = entries.find(i => i.id == li.dataset.documentId);
                    let newEntry = foundry.utils.duplicate(original);
                    newEntry.id = foundry.utils.randomID();
                    entries.push(newEntry);
                    that.document.setFlag('monks-enhanced-journal', 'entries', entries);
                }
            },
        ];
    }

    static onCheckItem(event, target) {
        let li = target.closest('li');
        let documentId = li.dataset.documentId;

        let entries = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal']?.entries || []);
        let entry = entries.find(i => i.id == documentId);

        if (entry) {
            entry.checked = $(target).prop('checked');
            this.document.setFlag('monks-enhanced-journal', 'entries', entries);
        }
    }

    static onToggleBar(event, target) {
        let li = target.closest('li.list-item');
        let id = li.dataset.documentId;
        if (this._expand[id]) return this.collapse(li);
        else return this.expand(li);
    }

    async collapse(li) {
        let id = li.dataset.documentId;
        if (!this._expand[id]) return true;
        const toggle = $(li).find(".poll-toggle");
        const icon = toggle.children("i");
        const bar = $(li).find(".poll-description");
        return new Promise(resolve => {
            bar.slideUp(200, () => {
                bar.addClass("collapsed");
                icon.removeClass("fa-caret-down").addClass("fa-caret-up");
                this._expand[id] = false;
                resolve(true);
            });
        });
    }

    async expand(li) {
        let id = li.dataset.documentId;
        if (this._expand[id]) return true;
        const toggle = $(li).find(".poll-toggle");
        const icon = toggle.children("i");
        const bar = $(li).find(".poll-description");
        return new Promise(resolve => {
            bar.slideDown(200, () => {
                bar.css("display", "");
                bar.removeClass("collapsed");
                icon.removeClass("fa-caret-up").addClass("fa-caret-down");
                this._expand[id] = true;
                resolve(true);
            });
        });
    }

    static async onVote(event, target) {
        let li = target.closest(".list-item");
        let entryId = li.dataset.documentId;

        let against = $(target).hasClass("against");

        let entries = foundry.utils.duplicate(foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.entries"));
        let entry = entries.find(i => i.id == entryId);

        if (!entry)
            return;

        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        let ownership = entry.ownership || { default: ownershipLevels.OBSERVER };
        let canVote = game.user.isGM || ownership?.default >= ownershipLevels.OBSERVER || ownership[game.user.id] >= ownershipLevels.OBSERVER;

        if (!canVote)
            return;

        if (game.user.isGM) {
            let players = entry.players || {};
            players[game.user.id] = !against;
            entry.players = players;

            if (!!entry.folder && setting("poll-folders-single-vote")) {
                let groupItems = entries.filter(i => i.folder == entry.folder && i.id != entry.id);
                for (let gi of groupItems) {
                    if (gi.players && gi.players[game.user.id] != undefined) {
                        delete gi.players[game.user.id];
                    }
                }
            }

            await this.document.update({ "flags.monks-enhanced-journal.entries": entries });
        } else {
            MonksEnhancedJournal.emit("vote", { userId: game.user.id, listId: this.document.uuid, entryId, against })
        }
    }

    static async onClearVote(event, target) {
        let li = target.closest(".list-item");
        let entryId = li.dataset.documentId;

        let entries = foundry.utils.duplicate(foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.entries"));
        let entry = entries.find(i => i.id == entryId);
        if (!entry)
            return;

        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        let ownership = entry.ownership || { default: ownershipLevels.OBSERVER };
        let canVote = game.user.isGM || ownership?.default >= ownershipLevels.OBSERVER || ownership[game.user.id] >= ownershipLevels.OBSERVER;

        if (!canVote)
            return;

        if (game.user.isGM) {
            let players = entry.players || {};
            delete players[game.user.id];
            entry.players = players;
            await this.document.update({ "flags.monks-enhanced-journal.entries": entries });
        } else {
            MonksEnhancedJournal.emit("clearVote", { userId: game.user.id, listId: this.document.uuid, entryId })
        }
    }

    static async onUpdateProgress(event, target) {
        let value = $(target).hasClass("decrease") ? -1 : 1;
        let li = target.closest(".list-item");
        let id = li.dataset.documentId;

        let entries = foundry.utils.duplicate(foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.entries"));
        let entry = entries.find(i => i.id == id);

        if (entry) {
            entry.count = Math.clamp((entry.count || 0) + value, 0, entry.max);
            await this.document.update({ "flags.monks-enhanced-journal.entries": entries });
        }
    }

    static onExpandProgress(event, target) {
        $(target).prev().toggleClass("expand");
        $(target).html($(target).prev().hasClass("expand") ? i18n("MonksEnhancedJournal.ShowLess") : i18n("MonksEnhancedJournal.ShowMore"));
    }
}

