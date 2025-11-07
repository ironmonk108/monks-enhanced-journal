import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
import { SlideText } from "../apps/slidetext.js";
import { createSlideThumbnail } from "../sheets/SlideshowSheet.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class SlideConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.document = options.document || {
            id: undefined, img: '', font: {}, color: '', sizing: '', effect: '', duration: 5, transition: 1, volume: 1, texts: [] };
    }

    static DEFAULT_OPTIONS = {
        id: "slide-config",
        tag: "form",
        classes: ["slide-config"],
        sheetConfig: false,
        window: {
            contentClasses: ["standard-form"],
            icon: "fa-solid fa-film",
            title: 'MonksEnhancedJournal.SlideConfiguration'
        },
        actions: {
        },
        position: { width: 620 },
        form: {
            handler: SlideConfig.onSubmitForm,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            classes: ["standard-form"],
            template: "modules/monks-enhanced-journal/templates/sheets/slideconfig.html",
            templates: [
                "templates/generic/tab-navigation.hbs",
            ]
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "details", icon: "fa-solid fa-image" },
                { id: "audio", icon: "fa-solid fa-music" },
                { id: "transition", icon: "fa-solid fa-running" },
                { id: "texts", icon: "fa-solid fa-book-open" },
            ],
            initial: "details",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "form":
                this._prepareBodyContext(context, options);
                context.subtabs = this._prepareTabs("primary");
                break;
            case "footer":
                context.buttons = this.prepareButtons();
        }

        return context;
    }

    _prepareBodyContext(context, options) {
        context.document = this.document;

        context.sizingOptions = {
                contain: "MonksEnhancedJournal.Contain",
                cover: "MonksEnhancedJournal.Cover",
                fill: "MonksEnhancedJournal.Stretch"
            };
        context.effectOptions = Object.assign({ '': i18n("MonksEnhancedJournal.InheritFromSlideshow") }, MonksEnhancedJournal.effectTypes);

        context.fontOptions = foundry.utils.mergeObject({ "": "" }, MonksEnhancedJournal.fonts);

        let windowSize = 25;
        let windowFont = $(".window-content", this.element).css("font-family");

        let journalFont = foundry.utils.getProperty(this.options.journalentry, "flags.monks-enhanced-journal.font") || {};
        let slideFont = foundry.utils.getProperty(this.document, "font") || {};

        context.texts = this.document.texts.map(t => {
            let text = foundry.utils.duplicate(t);
            let x = (((t.left || 0) / 100) * 600).toFixed(2);
            let y = (((t.top || 0) / 100) * 400).toFixed(2);
            let x2 = (((t.right || 0) / 100) * 600).toFixed(2);
            let y2 = (((t.bottom || 0) / 100) * 400).toFixed(2);
            let bgcolor = Color.from(t.background || '#000000');
            let color = t.color || slideFont.color || journalFont.color || "#FFFFFF";
            let font = t.font || slideFont.name || journalFont.name || windowFont;
            let size = t.size || slideFont.size || journalFont.size || windowSize;
            size = (size / windowSize) * 100;
            let style = {
                'font-size': size + "%",
                'font-family': font,
                color,
                'background-color': bgcolor.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                'text-align': (t.align == 'middle' ? 'center' : t.align),
                top: y + "px",
                left: x + "px",
                width: (600 - x2 - x) + "px",
                height: (400 - y2 - y) + "px",
            };
            text.style = Object.entries(style).filter(([k, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
            return text;
        });

        context.volume = this.document.volume ?? 1;

        context.thumbnail = (this.options.journalentry._thumbnails && this.document.id && this.options.journalentry._thumbnails[this.document.id]) || this.document.img;

        if (this.document.background?.color == '') {
            if (context.thumbnail)
                context.background = `background-image:url(\'${context.thumbnail}\');`;
            else
                context.background = `background-color:rgba(255, 255, 255, 0.5)`;
        }

        context.colorPlaceholder = slideFont.color || journalFont.color || "#FFFFFF";
        context.fontSizePlaceholder = slideFont.size || journalFont.size || windowSize;

        return context;
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

    get slideid() {
        return this.document.id || 'new';
    }

    
    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = foundry.utils.expandObject(formData.object);;

        let texts = this.document.texts;

        $('.slide-text', this.element).each(function () {
            let text = texts.find(t => t.id == this.dataset.id);
            let pos = $(this).position();
            text.left = (pos.left / 600) * 100;
            text.top = (pos.top / 400) * 100;
            text.right = ((600 - (pos.left + $(this).outerWidth())) / 600) * 100;
            text.bottom = ((400 - (pos.top + $(this).outerHeight())) / 400) * 100;
            text.text = $(this).val();
        });

        submitData.texts = texts;

        return submitData;
    }

    static async onSubmitForm(event, form, formData) {
        let submitData = this._prepareSubmitData(event, form, formData, {})
        log('updating slide', event, submitData, this.document);
        let slides = foundry.utils.duplicate(this.options.journalentry.flags["monks-enhanced-journal"].slides || []);

        if (this.document.id == undefined) {
            this.document.id = makeid();
            foundry.utils.mergeObject(this.document, submitData);
            slides.push(this.document);
            this.options.journalentry._thumbnails[this.slideid] = this.options.journalentry._thumbnails.new;
            delete this.options.journalentry._thumbnails.new;
        } else {
            let slide = slides.find(s => s.id == this.document.id);
            foundry.utils.mergeObject(slide, submitData);
        }

        await this.updateImage();

        await this.options.journalentry.setFlag('monks-enhanced-journal', 'slides', slides);
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        $('.slide-text', this.element)
            .on('mousedown', (ev) => { ev.stopPropagation(); $(ev.currentTarget).focus(); })
            .on('dblclick', this.editText.bind(this))
            .on('focus', this.selectText.bind(this))
            .on('blur', (ev) => {
                if ($(ev.currentTarget).val() == '')
                    this.deleteText($(ev.currentTarget));
            });

        $('.slide-textarea', this.element)
            .on('mousedown', (ev) => {
                if ($('.slide-text.selected', this.element).length == 0) {
                    let pos = $('.slide-textarea', this.element).offset();
                    this.orig = { x: ev.clientX - pos.left, y: ev.clientY - pos.top };
                    $('.slide-textarea', this.element).append($('<div>').addClass('text-create').css({ left: this.orig.x, top: this.orig.y }));
                } else {
                    this.clearText.call(this, ev);
                }
            })
            .on('mousemove', (ev) => {
                let pos = $('.slide-textarea', this.element).offset();
                let pt = { x: ev.clientX - pos.left, y: ev.clientY - pos.top};
                let mover = $('.mover.moving', this.element);
                let creator = $('.text-create', this.element);
                if (mover.length) {
                    mover.parent().css({ left: pt.x, top: pt.y });
                    $('.slide-text.selected', this.element).css({ left: pt.x, top: pt.y });
                } else if (creator.length) {
                    //creating a new text
                    creator.css({ left: Math.min(pt.x, this.orig.x), top: Math.min(pt.y, this.orig.y), width: Math.abs(pt.x - this.orig.x), height: Math.abs(pt.y - this.orig.y) });
                }
            })
            .on('mouseup', (ev) => {
                let mover = $('.mover.moving', this.element);
                let creator = $('.text-create', this.element);
                if (creator.length) {
                    //create text
                    if (creator.outerWidth() > 50 && creator.outerHeight() > 20) {
                        let pos = creator.position();
                        let data = {
                            left: (pos.left / 600) * 100,
                            top: (pos.top / 400) * 100,
                            right: ((600 - (pos.left + creator.outerWidth())) / 600) * 100,
                            bottom: ((400 - (pos.top + creator.outerHeight())) / 400) * 100
                        }
                        this.createText(data);
                    }
                    $('.text-create', this.element).remove();
                } else {
                    if (mover.length) {
                        mover.removeClass('moving');
                        $('.slide-text.selected', this.element).focus();
                    }
                    // Update the selected text with the new position
                    if ($('.slide-text.selected', this.element).length == 0)
                        return;

                    let pos = $('.slide-text.selected', this.element).position();
                    let data = {
                        left: (pos.left / 600) * 100,
                        top: (pos.top / 400) * 100,
                        right: ((600 - (pos.left + $('.slide-text.selected', this.element).outerWidth())) / 600) * 100,
                        bottom: ((400 - (pos.top + $('.slide-text.selected', this.element).outerHeight())) / 400) * 100
                    }
                    let textId = $('.slide-text.selected', this.element).get(0).dataset.id;
                    this.updateText(textId, data);
                }
            });

        $('.mover', this.element).on('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            let mover = $(ev.currentTarget);
            mover.addClass('moving');
        });

        var that = this;
        $('[name="img"] > input', this.element).on('change', this.updateImage.bind(this));
        $('select[name="sizing"]', this.element).on('change', this.updateImage.bind(this));
        $('[name="background.color"] > input[type="text"]', this.element).on('change', this.updateImage.bind(this));

        let size = (this.constructor.DEFAULT_OPTIONS.position.width - ($('.window-content', this.element).outerWidth() - $('.window-content', this.element).width())) / 50;
        $('.slide-textarea', this.element).css({ 'font-size': `${size}px` });

        $('.control-icon[data-action="edit"]', this.element).on('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            let textId = $('.slide-text.selected', this.element).get(0).dataset.id;
            let text = this.document.texts.find(t => t.id == textId);
            new SlideText({ document: text, slideconfig: this, journalentry: this.options.journalentry }).render(true);
        });
        $('.control-icon[data-action="delete"]', this.element).on('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.deleteText($(`.slide-text.selected`, this.element));
        });
    }

    async updateImage() {
        let src = $('[name="img"] > input', this.element).val()
        this.options.journalentry._thumbnails[this.slideid] = await createSlideThumbnail(src);
        let thumbnail = this.options.journalentry._thumbnails[this.slideid] || src;

        if (!this.options.slideElement)
            return;

        if ($('[name="background.color"] > input[type="text"]', this.element).val() == '')
            $('.slide-background div', this.options.slideElement).css({ 'background-image': `url(${thumbnail})`, 'background-color':'' });
        else
            $('.slide-background div', this.options.slideElement).css({ 'background-image': '', 'background-color': $('[name="background.color"] > input[type="text"]', this.element).val() });

        $('.slide-image', this.options.slideElement).attr('src', thumbnail).css({ 'object-fit': $('select[name="sizing"]', this.element).val()});
    }

    selectText(ev) {
        let element = $(ev.currentTarget);
        element.addClass('selected').siblings().removeClass('selected');
        $('.slide-hud', this.element).css({ left: element.position().left, top: element.position().top, width: element.outerWidth(), height: element.outerHeight() }).show();
    }

    editText(ev) {
        ev.preventDefault();
        ev = ev || window.event;
        let isRightMB = false;
        if ("which" in ev) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
            isRightMB = ev.which == 3;
        } else if ("button" in ev) { // IE, Opera 
            isRightMB = ev.button == 2;
        }

        // Ignore delete on lose focus
        $(`.slide-text.selected`, this.element).addClass("ignore-delete");

        if (!isRightMB) {
            let text = this.document.texts.find(t => t.id == ev.currentTarget.dataset.id);
            new SlideText({ document: text, slideconfig: this, journalentry: this.options.journalentry }).render(true);
        }
    }

    clearText(ev) {
        $('.slide-textarea .slide-text.selected', this.element).removeClass('selected');
        $('.slide-hud', this.element).hide();
    }

    createText(data) {
        let windowSize = 25;
        let windowFont = $(".window-content", this.element).css("font-family");

        let journalFont = foundry.utils.getProperty(this.options.journalentry, "flags.monks-enhanced-journal.font") || {};
        let slideFont = foundry.utils.getProperty(this.document, "font") || {};

        let text = {
            id: makeid(),
            align: 'left',
            font: '',
            size: '',
            left: data.left,
            top: data.top,
            right: data.right,
            bottom: data.bottom,
            color: '',
            background: '#000000',
            opacity: 0.5
        };
        this.document.texts.push(text);

        let x = (((text.left || 0) / 100) * 600).toFixed(2);
        let y = (((text.top || 0) / 100) * 400).toFixed(2);
        let x2 = (((text.right || 0) / 100) * 600).toFixed(2);
        let y2 = (((text.bottom || 0) / 100) * 400).toFixed(2);
        let bgcolor = Color.from(text.background || '#000000');
        let color = text.color || slideFont.color || journalFont.color || "#FFFFFF";
        let font = text.font || slideFont.name || journalFont.name || windowFont;
        let size = text.size || slideFont.size || journalFont.size || windowSize;
        size = (size / windowSize) * 100;
        let style = {
            'font-size': size + "%",
            'font-family': font,
            color,
            'background-color': bgcolor.toRGBA(text.opacity != undefined ? text.opacity : 0.5),
            'text-align': (text.align == 'middle' ? 'center' : text.align),
            top: y + "px",
            left: x + "px",
            width: (600 - x2 - x) + "px",
            height: (400 - y2 - y) + "px",
        };

        let textarea = $('<textarea>')
            .addClass('slide-text')
            .attr({ 'data-id': text.id })
            .css(style)
            .on('mousedown', (ev) => { ev.stopPropagation(); $(ev.currentTarget).focus(); })
            .on('dblclick', this.editText.bind(this))
            .on('focus', this.selectText.bind(this))
            .on('blur', (ev) => {
                if ($(ev.currentTarget).val() == '' && !$(ev.currentTarget).hasClass("ignore-delete")) {
                    this.deleteText($(ev.currentTarget));
                }
            });
        $('.slide-textarea', this.element).append(textarea);
        textarea.focus();
    }

    // This is called from the slide text editor when it is saved
    updateText(id, data) {
        let text = this.document.texts.find(t => t.id == id);
        if (!text)
            return;
        if (data.text == '')
            this.deleteText($(`.slide-text[data-id="${id}"]`, this.element));
        else {
            $(`.slide-text[data-id="${id}"]`, this.element).removeClass("ignore-delete");
            foundry.utils.mergeObject(text, data);
            this.refreshText(text);
        }
    }

    refreshText(t) {
        if (t) {
            let windowSize = 25;
            let windowFont = $(".window-content", this.element).css("font-family");

            let journalFont = foundry.utils.getProperty(this.options.journalentry, "flags.monks-enhanced-journal.font");
            let slideFont = foundry.utils.getProperty(this.document, "font") || {};

            let x = (((t.left || 0) / 100) * 600);
            let y = (((t.top || 0) / 100) * 400);
            let x2 = (((t.right || 0) / 100) * 600);
            let y2 = (((t.bottom || 0) / 100) * 400);
            let bgcolor = Color.from(t.background || '#000000');
            let color = t.color || slideFont.color || journalFont.color || "#FFFFFF";
            let font = t.font || slideFont.name || journalFont.name || windowFont;
            let size = t.size || slideFont.size || journalFont.size || windowSize;
            size = (size / windowSize) * 100;
            let style = {
                'font-size': size + "%",
                'font-family': font,
                color,
                'background-color': bgcolor.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                'text-align': (t.align == 'middle' ? 'center' : t.align),
                top: y + "px",
                left: x + "px",
                width: (600 - x2 - x) + "px",
                height: (400 - y2 - y) + "px",
            };
            $(`.slide-text[data-id="${t.id}"]`, this.element).val(t.text).css(style);
        }
    }

    deleteText(element) {
        if (element.length && element.hasClass('slide-text')) {
            let id = element[0].dataset.id;
            this.document.texts.findSplice(i => i.id == id);
            element.remove();
            $('.slide-hud', this.element).hide();
        }
    }
}