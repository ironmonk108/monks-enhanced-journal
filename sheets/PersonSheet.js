import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { MakeOffering } from "../apps/make-offering.js";

export class PersonSheet extends EnhancedJournalSheet {
    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.person",
            icon: "fa-solid fa-user",
        },
        actions: {
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/person.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-detailed-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-textentry.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-details.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-offerings.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-relationships.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-notes.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".editor-display",
                ".editor-content",
                ".relationships .items-list .item-list",
                ".offering-list .items-list .item-list"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "description", icon: "fa-solid fa-file-signature" },
                { id: "entry-details", icon: "fa-solid fa-table" },
                { id: "relationships", icon: "fa-solid fa-users" },
                { id: "offerings", icon: "fa-solid fa-hand-holding-hand" },
                { id: "notes", icon: "fa-solid fa-paperclip" },
            ],
            initial: "description",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    static get type() {
        return 'person';
    }

    static get defaultObject() {
        return { relationships: [], attributes: {} };
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

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

        let actorLink = this.document.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = actorLink.id ? game.actors.find(a => a.id == actorLink.id) : await fromUuid(actorLink);

            if (actor && actor.testUserPermission(game.user, "OBSERVER")) {
                context.actor = { uuid: actor.uuid, name: actor.name, img: actor.img };
            }
        }
        context.canViewActor = !!context.actor

        context.detailFields = this.fieldlist();

        let currency = (context.data.flags['monks-enhanced-journal'].currency || []);
        context.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: currency[c.id] ?? 0 };
        });

        context.offerings = this.getOfferings();

        context.has = {
            relationships: Object.keys(context.relationships || {})?.length > 0,
            offerings: context.offerings?.length > 0
        }

        context.fields = [
            { id: 'role', label: "MonksEnhancedJournal.Role", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.role") },
            { id: 'location', label: "MonksEnhancedJournal.Location", value: foundry.utils.getProperty(context.data, "flags.monks-enhanced-journal.location") }
        ]
        context.placeholder = "MonksEnhancedJournal.PersonName";

        context.hasRollTables = !!game.packs.get("monks-enhanced-journal.person-names") && this.document.isOwner;

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
        //if (game.modules.get("VoiceActor")?.active) {

        //}
        return ctrls.concat(super._documentControls());
    }

    async createName() {
        let pack = game.packs.get("monks-enhanced-journal.person-names");
        await pack.getDocuments();

        let attributes = foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.attributes") || {};
        let race = attributes.race || attributes.ancestry || "Human";

        let firstName = "";
        let secondName = "";

        let nosecond = false;
        let first = pack.contents.find(c => c.name.toLowerCase() == (`${race} First Name`).toLowerCase());
        if (!first) {
            first = pack.contents.find(c => c.name.toLowerCase() == (`${race} Name`).toLowerCase());
            if (!first)
                first = first = pack.contents.find(c => c.name == "Human First Name");
            else
                nosecond = true;
        }
        if (first) firstName = await first.draw({ displayChat: false });

        let second = "";
        if (!nosecond) {
            second = pack.contents.find(c => c.name.toLowerCase() == (`${race} Last name`).toLowerCase());
            if (!second)
                second = pack.contents.find(c => c.name == "Human Last Name");
        }
        if (second) secondName = await second.draw({ displayChat: false });

        if (firstName || secondName) {
            return `${firstName ? firstName.results[0].description : ""}${firstName && secondName ? " " : ""}${secondName ? secondName.results[0].description : ""}`;
        }
        return "";
    }
}
