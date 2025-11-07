import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class PlaceSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.place",
            icon: "fa-solid fa-place-of-worship",
        },
        actions: {

        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/place.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-detailed-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-details.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-relationships.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-notes.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".editor-display",
                ".editor-content",
                ".details-section.scrollable",
                ".tab[data-tab='townsfolk'] .items-list .item-list",
                ".tab[data-tab='shops'] .items-list .item-list",
                ".tab[data-tab='relationships'] .items-list .item-list"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "entry-details", icon: "fa-solid fa-table" },
                { id: "townsfolk", icon: "fa-solid fa-people-roof" },
                { id: "shops", icon: "fa-solid fa-shop" },
                { id: "relationships", icon: "fa-solid fa-users" },
                { id: "notes", icon: "fa-solid fa-paperclip" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    static get type() {
        return 'place';
    }

    static get defaultObject() {
        return { shops: [], townsfolk: [], attributes: {} };
    }

    _prepareTabs(group) {
        let tabs = super._prepareTabs(group);

        if (!game.user.isGM) {
            // Check for relationships of type person and remove townsfolk tab if none exist
            let relationships = Object.values(this.document.getFlag("monks-enhanced-journal", "relationships") || {});
            if (relationships.filter(r => r.type == "person").length == 0) {
                delete tabs.townsfolk;
            }
            // Check for relationships of type shop and remove shops tab if none exist
            if (relationships.filter(r => r.type == "shop").length == 0) {
                delete tabs.shops;
            }
            // Check for relationships of other types and remove relationships tab if none exist
            if (relationships.filter(r => r.type != "person" && r.type != "shop").length == 0) {
                delete tabs.relationships;
            }
        }

        return tabs;
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        if (context?.data?.flags['monks-enhanced-journal']?.townsfolk) {
            context.data.flags['monks-enhanced-journal'].relationships = context?.data?.flags['monks-enhanced-journal']?.townsfolk;
            await this.document.setFlag('monks-enhanced-journal', 'relationships', context.data.flags['monks-enhanced-journal'].relationships);
            await this.document.unsetFlag('monks-enhanced-journal', 'townsfolk');
        }

        if (foundry.utils.hasProperty(context, "data.flags.monks-enhanced-journal.attributes")) {
            // check to make sure the attributes are formatted correctly
            let changedObjectValues = false;
            let sheetSettings = {};
            let attributes = context?.data?.flags['monks-enhanced-journal']?.attributes || {};
            for (let [k, v] of Object.entries(attributes)) {
                if (typeof v == "object") {
                    sheetSettings[k] = { shown: !v.hidden };
                    attributes[k] = v.value;
                    changedObjectValues = true;
                }
            }
            if (changedObjectValues) {
                await this.document.update({ 'monks-enhanced-journal.flags.sheet-settings.attributes': sheetSettings });
                await this.document.setFlag('monks-enhanced-journal', 'attributes', attributes);
            }
        } else if (foundry.utils.hasProperty(context, "data.flags.monks-enhanced-journal.fields")) {
            // convert fields to attributes
            let fields = foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal.fields");
            let attributes = {};
            let sheetSettings = {};
            let flags = foundry.utils.getProperty(context, "data.flags.monks-enhanced-journal") || {};
            let defaultSettings = this.document.constructor.sheetSettings() || {};

            for (let attr of Object.keys(defaultSettings.attributes)) {
                attributes[attr] = flags[attr] || "";
                if (fields[attr] != undefined)
                    sheetSettings[attr].shown = !!fields[attr]?.value;
            }
            foundry.utils.setProperty(context, "data.flags.monks-enhanced-journal.attributes", attributes);
            foundry.utils.setProperty(context, "data.flags.monks-enhanced-journal.sheet-settings.attributes", sheetSettings);
            await this.document.setFlag('monks-enhanced-journal', 'attributes', attributes);
            await this.document.update({ 'monks-enhanced-journal.flags.sheet-settings.attributes': sheetSettings });
        }

        context.relationships = await this.getRelationships();
        if (context.relationships?.shop?.documents?.length) {
            context.shops = {
                shop: {
                    documents: (context.relationships?.shop?.documents || []),
                    name: i18n("MonksEnhancedJournal.Shops"),
                    type: 'shop',
                }
            };
            context.shopAdditional = { id: "shoptype", label: "MonksEnhancedJournal.ShopType" };
            context.shops.shop.documents = context.shops.shop.documents.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (context.relationships?.person?.documents?.length) {
            context.townsfolk = {
                person: {
                    documents: (context.relationships?.person?.documents || []),
                    name: i18n("MonksEnhancedJournal.Townsfolk"),
                    type: 'person',
                }
            };
            context.townsfolkAdditional = { id: "role", label: "MonksEnhancedJournal.Role" };
            context.townsfolk.person.documents = context.townsfolk.person.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        delete context.relationships.shop;
        delete context.relationships.person;

        for (let [k, v] of Object.entries(context.relationships)) {
            v.documents = v.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        context.detailFields = this.fieldlist();

        context.has = {
            relationships: Object.keys(context.relationships || {})?.length > 0,
            townsfolk: context.townsfolk?.person.documents.length > 0,
            shops: context.shops?.shop.documents.length > 0
        }

        context.fields = [
            { id: 'placetype', label: "MonksEnhancedJournal.Type", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.placetype") },
            { id: 'location', label: "MonksEnhancedJournal.Location", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.location") }
        ]
        context.placeholder = "MonksEnhancedJournal.Place";

        return context;
    }

    fieldlist() {
        let settings = this.sheetSettings() || {};
        let fields = MonksEnhancedJournal.convertObjectToArray(settings?.attributes);
        let attributes = this.document.flags['monks-enhanced-journal'].attributes || {};
        return fields
            .filter(f => f.shown)
            .map(f => {
                let attr = attributes[f.id];
                return {
                    id: f.id,
                    name: f.name,
                    value: attr,
                    full: f.full
                }
            });
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

    _getSubmitData(updateData = {}) {
        let data = foundry.utils.expandObject(super._getSubmitData(updateData));

        if (data.relationships) {
            data.flags['monks-enhanced-journal'].relationships = foundry.utils.duplicate(this.document.getFlag("monks-enhanced-journal", "relationships") || []);
            for (let relationship of data.flags['monks-enhanced-journal'].relationships) {
                let dataRel = data.relationships[relationship.id];
                if (dataRel)
                    relationship = foundry.utils.mergeObject(relationship, dataRel);
            }
            delete data.relationships;
        }

        if (data.flags['monks-enhanced-journal']?.attributes) {
            data.flags['monks-enhanced-journal'].attributes = foundry.utils.mergeObject((this.document?.flags['monks-enhanced-journal']?.attributes || {}), (data.flags['monks-enhanced-journal']?.attributes || {}));
        }

        return foundry.utils.flattenObject(data);
    }
}
