import { MonksEnhancedJournal, log, error, i18n, setting, makeid, getVolume } from "../monks-enhanced-journal.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ListItemEdit extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "list-item-edit",
        tag: "form",
        classes: ["list-edit"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: 'Edit Item'
        },
        actions: {
            
        },
        position: { width: 800 },
        form: {
            handler: ListItemEdit.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "./modules/monks-enhanced-journal/templates/sheets/list-item-edit.html"
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "form":
                await this._prepareBodyContext(context, options);
                break;
            case "footer":
                context.buttons = this.prepareButtons();
        }

        return context;
    }

    async _prepareBodyContext(context, options) {
        const folders = this.options.sheet.folders;
        context = foundry.utils.mergeObject(context, {
            title: this.options.document?.title,
            text: this.options.document?.text,
            count: this.options.document?.count,
            voteFor: this.options.document?.votefor,
            voteAgainst: this.options.document?.against,
            max: this.options.document?.max,
            folder: this.options.document?.folder || this.options.folder,
            folders: folders,
            hasFolders: folders.length > 0,
            subtype: this.options.sheet.subtype
        });

        if (this.options.sheet.subtype == "poll") {
            context.players = game.users.map(u => {
                let player = (this.options.document?.players || {})[u.id];
                return {
                    id: u.id,
                    name: u.name,
                    img: u.img,
                    vote: player == undefined ? "" : player === false ? "against" : "for"
                }
            });
        }

        return context;
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "SaveChanges",
            },
        ];
    }

    static async onSubmitForm(event, form, formData) {
        let submitData = foundry.utils.expandObject(formData.object);

        let players = submitData.players || {};
        for (let [playerId, playerData] of Object.entries(players)) {
            if (playerData == "") {
                delete players[playerId];
                continue;
            }
            players[playerId] = playerData == "true" ? true : false;
        }
        

        let document = this.options.document || {};
        foundry.utils.mergeObject(document, submitData);
        document.players = players;

        let entries = foundry.utils.duplicate(this.options.sheet.document.flags["monks-enhanced-journal"].entries || []);
        if (document.id == undefined) {
            document.id = makeid();
            entries.push(document);
        } else {
            entries.findSplice((i) => i.id == document.id, document);
        }

        this.options.sheet.document.setFlag('monks-enhanced-journal', 'entries', entries);
    }
}