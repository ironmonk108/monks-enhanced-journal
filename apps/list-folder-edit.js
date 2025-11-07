import { MonksEnhancedJournal, log, error, i18n, setting, makeid, getVolume } from "../monks-enhanced-journal.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ListFolderEdit extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "list-folder-edit",
        tag: "form",
        classes: ["list-edit"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: 'Edit Folder'
        },
        actions: {
            
        },
        position: { width: 480 },
        form: {
            handler: ListFolderEdit.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "./modules/monks-enhanced-journal/templates/sheets/list-folder-edit.html"
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
        return foundry.utils.mergeObject(context, {
            name: this.options.document?.name,
            parent: this.options.document?.parent || this.options.folder,
        });
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
        let document = this.options.document || {};
        foundry.utils.mergeObject(document, submitData);
        let folders = foundry.utils.duplicate(this.options.sheet.document.flags["monks-enhanced-journal"].folders || []);

        if (document.id == undefined) {
            document.id = makeid();
            folders.push(document);
        } else {
            folders.findSplice((i) => i.id == document.id, document);
        }

        this.options.sheet.document.setFlag('monks-enhanced-journal', 'folders', folders);
    }
}