import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class MakeOffering extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);

        this.offering = foundry.utils.mergeObject({
            currency: {},
            items: []
        }, options.offering || {});

        if (game.user.character && !this.offering.actor) {
            this.offering.actor = {
                id: game.user.character.id,
                name: game.user.character.name,
                img: game.user.character.img
            }
        }
    }

    static DEFAULT_OPTIONS = {
        id: "make-offering",
        tag: "form",
        classes: ["make-offering"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form", "monks-journal-sheet"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.MakeOffering"
        },
        actions: {
            removeOffering: MakeOffering.removeOffering,
            cancel: MakeOffering.onClose
        },
        position: { width: 600 },
        form: {
            handler: MakeOffering.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/make-offering.html"
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "form":
                this._prepareBodyContext(context, options);
                break;
            case "footer":
                context.buttons = this.prepareButtons();
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        context.private = this.offering.hidden;

        context.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        context.coins = this.offering.currency;
        context.items = (this.offering.items || []).map(i => {
            let actor = game.actors.get(i.actorId)
            if (!actor)
                return null;

            let item = actor.items.get(i.id);
            if (!item)
                return null;

            let details = MonksEnhancedJournal.getItemDetails(item);

            return {
                id: i.id,
                name: game.user.isGM ? details.identifiedName : details.name,
                img: details.img,
                qty: i.qty
            }
        }).filter(i => !!i);

        let actor = game.actors.get(this.offering?.actor?.id);
        context.actor = {
            id: actor?.id,
            name: actor?.name || "No Actor",
            img: actor?.img || "icons/svg/mystery-man.svg"
        };

        return context;
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-hand-holding-usd",
                label: "Offer",
            },
            {
                type: "button",
                icon: "fas fa-times",
                label: "Cancel",
                action: "cancel"
            },
        ];
    }

    _canDragDrop() {
        return true;
    }

    async _onDrop(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type == 'Item') {
            let item = await fromUuid(data.uuid);
            let actor = item.parent;

            //Only allow items from an actor
            if (!actor || actor.compendium)
                return;

            let max = getValue(item.system, quantityname(), null);

            this.offering.actor = {
                id: actor.id,
                name: actor.name,
                img: actor.img
            }

            let result = await this.options.journalsheet.constructor.confirmQuantity(item, max, "offer", false);
            if ((result?.quantity ?? 0) > 0) {

                this.offering.items.push({
                    id: item.id,
                    itemName: item.name,
                    actorId: actor.id,
                    actorName: actor.name,
                    qty: result.quantity
                });
                this.render();
            }
        } else if (data.type == "Actor") {
            let actor = await fromUuid(data.uuid);

            if (!actor || actor.compendium)
                return;

            this.offering.actor = {
                id: actor.id,
                name: actor.name,
                img: actor.img
            }
            this.render();
        }

        log('drop data', event, data);
    }

    static onSubmitForm(event, form, formData) {
        this.offering.userid = game.user.id;
        this.offering.state = "offering";

        if (game.user.isGM || this.options.document.isOwner) {
            let offerings = foundry.utils.duplicate(this.options.document.getFlag("monks-enhanced-journal", "offerings") || []);
            this.offering.id = makeid();
            offerings.unshift(this.offering);
            this.options.document.setFlag("monks-enhanced-journal", "offerings", offerings);
        } else {
            MonksEnhancedJournal.emit("makeOffering", { offering: this.offering, uuid: this.options.document.uuid });
        }
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        $('.actor-icon', this.element).on("dblclick", this.openActor.bind(this));

        $('.private', this.element).on("change", (event) => {
            this.offering.hidden = $(event.currentTarget).prop("checked");
        });
        $('.currency-field', this.element).on("blur", (event) => {
            this.offering.currency[$(event.currentTarget).attr("name")] = parseInt($(event.currentTarget).val() || 0);
        });

        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: ".make-offer-container",
            permissions: {
                drop: this._canDragDrop
            },
            callbacks: {
                drop: this._onDrop.bind(this)
            }
        }).bind(this.element);
    }

    static removeOffering(event, target) {
        let that = this;
        const id = target.closest(".item").dataset.id;
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: `Remove offering Item`,
            },
            content: "Are you sure you want to remove this item from the offering?",
            yes: {
                callback: () => {
                    that.offering.items.findSplice(i => i.id == id);
                    that.render();
                }
            }
        });
    }

    async openActor() {
        try {
            let actor = game.actors.get(this.offering?.actor?.id);
            if (actor) {
                actor.sheet.render(true);
            }
        } catch {}
    }

    static onClose(event, form) {
        this.close();
    }
}