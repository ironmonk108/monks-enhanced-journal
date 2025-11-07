import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class SelectPlayer extends HandlebarsApplicationMixin(ApplicationV2) {
    users = [];
    showpic = false;
    updatepermission = false;

    constructor(sheet, options = {}) {
        super(sheet.object, options);
        this.showpic = (options.showpic != undefined ? options.showpic : false);
        this.updatepermission = (options.updatepermission != undefined ? options.updatepermission : false);

        this.journalsheet = sheet;
    }

    static DEFAULT_OPTIONS = {
        id: "select-player",
        tag: "form",
        classes: ["select-sheet"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.SelectPlayer"
        },
        actions: {
        },
        position: { width: 400 },
        form: {
            handler: SelectPlayer.onSubmitForm,
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/selectplayer.html"
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
        return foundry.utils.mergeObject(context, {
        });
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "MonksEnhancedJournal.ShowAll",
            },
            {
                type: "button",
                icon: "fas fa-save",
                label: "MonksEnhancedJournal.Show",
            },
        ];
    }

    getData(options) {
        this.users = game.users.map(u => {
            return {
                id: u.id,
                name: u.name,
                active: u.active,
                selected: false
            };
        }).filter(u => u.id != game.user.id);
        return foundry.utils.mergeObject(super.getData(options),
            {
                users: this.users,
                picchoice: this.canShowPic(),
                showpic: this.showpic,
                updatepermission: this.updatepermission
            }
        );
    }

    canShowPic() {
        let type = this.journalsheet.object?.flags["monks-enhanced-journal"]?.type || 'oldentry';
        return ((["person", "place", "poi", "event", "quest", "oldentry", "organization", "shop", "oldentry", "journalentry", "base"].includes(type) || this.document.documentName == 'Actor') && this.document.img);
    }

    updateSelection(event) {
        log('Changing selection');
        let ctrl = event.currentTarget;
        let li = ctrl.closest('li');
        let id = li.dataset.userId;

        let user = this.users.find(u => u.id == id);
        user.selected = $(ctrl).is(':checked');
    }

    updateShowPic(event) {
        this.showpic = $(event.currentTarget).is(':checked');
        if (this.showpic) {
            this.updatepermission = false;
            $('.update-permission', this.element).prop('checked', false);
        }
    }

    updatePermission(event) {
        this.updatepermission = $(event.currentTarget).is(':checked');
        if (this.updatepermission) {
            this.showpic = false;
            $('.show-pic', this.element).prop('checked', false);
        }
    }

    showPlayers(mode, event) {
        let users = this.users.filter(u => u.selected);
        if (mode == 'players' && users.length == 0) {
            ui.notifications.info(i18n("MonksEnhancedJournal.msg.NoPlayersSelected"));
            return;
        }
        event.data = { users: (mode == 'all' ? null : users), options: { showpic: this.showpic, updatepermission: this.updatepermission }};
        this.journalsheet._onShowPlayers.call(this.journalsheet, event);
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        this.element.find('button[name="showall"]').click(this.showPlayers.bind(this, 'all'));
        this.element.find('button[name="show"]').click(this.showPlayers.bind(this, 'players'));

        this.element.find('input[type="checkbox"].user-select').change(this.updateSelection.bind(this));
        this.element.find('input[type="checkbox"].pic-select').change(this.updateShowPic.bind(this));
        this.element.find('input[type="checkbox"].update-permission').change(this.updatePermission.bind(this));
    }
}