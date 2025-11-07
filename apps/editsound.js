import { MonksEnhancedJournal, log, error, i18n, setting, makeid, getVolume } from "../monks-enhanced-journal.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class EditSound extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options) {
        super(options);
        this.document = options.document;
    }

    static DEFAULT_OPTIONS = {
        id: "journal-editsound",
        tag: "form",
        classes: ["edit-sound"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            //icon: "fa-solid fa-align-justify",
            title: "MonksEnhancedJournal.EditSound"
        },
        actions: {
            
        },
        position: { width: 500 },
        form: {
            handler: EditSound.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "./modules/monks-enhanced-journal/templates/edit-sound.html"
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
        let sound = foundry.utils.mergeObject({ volume: 1, loop: true, autoplay: true }, (this.document.getFlag("monks-enhanced-journal", "sound") || {}));
        return foundry.utils.mergeObject(context, {
            sound: sound
        });
    }

    prepareButtons() {
        return [
            {
                type: "submit",
                icon: "far fa-save",
                label: "MonksEnhancedJournal.Update",
            }
        ];
    }

    static async onSubmitForm(event, form, formData) {
        let submitData = foundry.utils.expandObject(formData.object);
        if (this.options.sound) {
            let oldData = this.document.getFlag('monks-enhanced-journal', 'sound');
            if (oldData.volume != submitData.sound.volume) {
                this.options.sound.effectiveVolume = submitData.sound.volume;
                this.options.sound.volume = submitData.sound.volume * getVolume();
            }
            if (oldData.loop != submitData.sound.loop)
                this.options.sound.loop = submitData.sound.loop;
            if (oldData.audiofile != submitData.sound.audiofile) {
                let isPlaying = this.options.sound.playing;
                if (this.options.sound?.playing)
                    this.options.sound.stop();
                if (submitData.sound.audiofile) {
                    this.options.journalsheet.loadSound(submitData.sound.audiofile, isPlaying, { loop: submitData.sound.loop, volume: submitData.sound.volume });
                } else
                    this.options.journalsheet.clearSound();
            }
        }

        this.document.setFlag('monks-enhanced-journal', 'sound', submitData.sound);
        this.submitting = true;
    }
}