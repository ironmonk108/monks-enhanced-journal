import { SlideConfig } from "../apps/slideconfig.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export let createSlideThumbnail = (src) => {
    return SlideshowSheet.createSlideThumbnail(src);
}

export class SlideshowSheet extends EnhancedJournalSheet {
    constructor(options) {
        super(options);
    }

    static DEFAULT_OPTIONS = {
        window: {
            title: "MonksEnhancedJournal.sheettype.slideshow",
            icon: "fa-solid fa-photo-video",
        },
        actions: {
            addSlide: SlideshowSheet.doAddSlide,
            deleteAll: SlideshowSheet.deleteAll,
        },
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-enhanced-journal/templates/sheets/slideshow.html",
            templates: [
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-header.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-slide-details.hbs",
                "modules/monks-enhanced-journal/templates/sheets/partials/sheet-slides.hbs",
                "templates/generic/tab-navigation.hbs",
            ],
            scrollable: [
                ".slide-details > div",
                ".slideshow-body"
            ]
        }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "slide-details", icon: "fa-solid fa-file-signature" },
                { id: "slides", icon: "fa-solid fa-table" },
            ],
            initial: "slide-details",
            labelPrefix: "MonksEnhancedJournal.tabs"
        }
    };

    /*
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.sheettype.slideshow"),
            template: "modules/monks-enhanced-journal/templates/sheets/slideshow.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "entry-details" }],
            dragDrop: [
                { dragSelector: ".slide", dropSelector: ".slide" },
                { dragSelector: ".slide", dropSelector: ".slideshow-body" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.entry-details .tab-inner", ".tab.slides .tab-inner"]
        });
    }
    */

    static get type() {
        return 'slideshow';
    }

    static get defaultObject() {
        return { playstate: 'stopped', slides: [] };
    }

    _dragDrop(html) {
        super._dragDrop(html);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".slide",
            dropSelector: ".slideshow-body, .slide ",
            permissions: {
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(html);
    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);

        if (options.play)
            this.playSlideshow();
    }

    async _prepareBodyContext(context, options) {
        context = await super._prepareBodyContext(context, options);

        context.playControls = true;

        context.fontOptions = foundry.utils.mergeObject({ "": "" }, MonksEnhancedJournal.fonts);

        let flags = (context.data.flags["monks-enhanced-journal"]);
        if (flags == undefined) {
            context.data.flags["monks-enhanced-journal"] = {};
            flags = (context.data.flags["monks-enhanced-journal"]);
        }
        context.showasOptions = { canvas: i18n("MonksEnhancedJournal.Canvas"), fullscreen: i18n("MonksEnhancedJournal.FullScreen"), window: i18n("MonksEnhancedJournal.Window") };
        if (flags.playstate == undefined)
            flags.playstate = 'stopped';
        context.playing = (flags.playstate != 'stopped') || !this.document.isOwner;

        context.effectOptions = MonksEnhancedJournal.effectTypes;

        const playlists = game.playlists.map(doc => {
            return { id: doc.id, name: doc.name };
        });
        playlists.sort((a, b) => a.name.localeCompare(b.name));
        context.playlists = playlists;

        let idx = 0;
        if (flags.slides) {
            let changed = false;
            let slides = foundry.utils.duplicate(flags.slides);
            for (let slide of slides) {
                if (slide.text != undefined && slide.texts == undefined) {
                    changed = true;
                    slide.texts = [];
                    if (slide.text.content != '') {
                        slide.texts.push({
                            id: makeid(),
                            width: 100,
                            top: (slide.text?.valign == 'top' ? 10 : (slide.text?.valign == 'middle' ? 40 : 80)),
                            left: 0,
                            align: slide.text?.align,
                            background: slide.text?.background,
                            fadein: 0,
                            fadeout: null,
                            color: slide.text?.color,
                            text: slide.text?.content
                        });
                    }
                }
            }
            if (changed) {
                this.document.setFlag("monks-enhanced-journal", "slides", slides);
                flags.slides = slides;
            }

            let windowSize = 25;
            let windowFont = $(".window-content").css('font-family');

            let journalFont = foundry.utils.getProperty(flags, "font") || {};
             
            context.slides = flags.slides.map(s => {
                let slide = foundry.utils.duplicate(s);

                let slideFont = s.font || {};

                slide.thumbnail = s.img ? (this.document._thumbnails && this.document._thumbnails[slide.id]) || "/modules/monks-enhanced-journal/assets/loading.gif" : ""; //slide.img;

                if (slide.background?.color == '' && slide.thumbnail)
                    slide.background = `background-image:url(\'${slide.thumbnail}\');`;
                else
                    slide.background = `background-color:${slide.background.color || "#ffffff"}`;

                slide.texts = slide.texts.map(t => {
                    let text = foundry.utils.duplicate(t);
                    let bgcolor = Color.from(t.background || '#000000');
                    let color = t.color || slideFont.color || journalFont.color || '#FFFFFF';
                    let font = t.font || slideFont.name || journalFont.name || windowFont;
                    let size = t.size || slideFont.size || journalFont.size || windowSize;
                    size = (size  / windowSize) * 100;
                    let style = {
                        color,
                        'font-size': size + "%",
                        'font-family': font,
                        'background-color': bgcolor.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                        'text-align': (t.align == 'middle' ? 'center' : t.align),
                        top: (t.top || 0) + "%",
                        left: (t.left || 0) + "%",
                        right: (t.right || 0) + "%",
                        bottom: (t.bottom || 0) + "%",
                    };
                    text.style = Object.entries(style).filter(([k, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
                    return text;
                });

                return slide;
            });

            if (flags.slideAt && flags.slideAt < context.slides.length)
                context.slides[flags.slideAt].active = true;
        }

        if (flags.playstate !== 'stopped' && context.slides) {
            context.slideshowing = context.slides[flags.slideAt || 0];

            if (context.slideshowing?.transition?.duration > 0) {
                let time = context.slideshowing.transition.duration * 1000;
                let timeRemaining = time - ((new Date()).getTime() - context.slideshowing.transition.startTime);
                context.slideshowing.durprog = (timeRemaining / time) * 100;
            } else
                context.slideshowing.durlabel = i18n("MonksEnhancedJournal.ClickForNext");
        }

        context.placeholder = "MonksEnhancedJournal.sheettype.slideshow";

        return context;
    }

    get canPlaySound() {
        return false;
    }

    async _render(force, options = {}) {
        await super._render(force, options);

        if (!this.document.testUserPermission(game.user, "OWNER") || options.play) {
            this.playSlideshow();
        }
    }

    static async createSlideThumbnail(src) {
        if (!src) return null;
        try {
            if (foundry.helpers.media.VideoHelper.hasVideoExtension(src)) {
                const t = await foundry.helpers.media.ImageHelper.createThumbnail(src, { format: "image/jpeg", quality: 0.5, width: 200, height: 150 });

                return t.thumb;
            } else {
                const texture = await foundry.canvas.loadTexture(src);
                let sprite = PIXI.Sprite.from(texture);

                // Reduce to the smaller thumbnail texture
                let ratio = 400 / sprite.width;
                let width = sprite.width * ratio;
                let height = sprite.height * ratio;
                const reduced = foundry.helpers.media.ImageHelper.compositeCanvasTexture(sprite, { width: width, height: height });
                const thumb = foundry.helpers.media.ImageHelper.textureToImage(reduced, { format: "image/jpeg", quality: 0.5 });
                reduced.destroy(true);

                return thumb;
            }
        } catch (err) {
            log('error', err);
        }

        return null;
    }

    async loadThumbnails() {
        this.document._thumbnails = {};
        for (let slide of this.document.flags["monks-enhanced-journal"].slides || []) {
            this.document._thumbnails[slide.id] = await SlideshowSheet.createSlideThumbnail(slide.img);
            if (this.document._thumbnails[slide.id]) {
                $(`.slide[data-slide-id="${slide.id}"] .slide-image`).attr('src', this.document._thumbnails[slide.id]);
                if (slide.background?.color == '')
                    $(`.slide[data-slide-id="${slide.id}"] .slide-background div`).css({ 'background-image': `url('${this.document._thumbnails[slide.id]}')` });
            }
        }
    }

    _documentControls() {
        let ctrls = [
            { id: 'add', label: i18n("MonksEnhancedJournal.AddSlide"), icon: 'fas fa-plus', visible: game.user.isGM || this.document.isOwner, action: "addSlide" },
            { id: 'clear', label: i18n("MonksEnhancedJournal.ClearAll"), icon: 'fas fa-dumpster', visible: game.user.isGM || this.document.isOwner, action: "deleteAll" },
         ];
        ctrls = ctrls.concat(super._documentControls());
        return ctrls;
    }

    async refresh() {
        super.refresh();
        let playstate = this.document.flags['monks-enhanced-journal'].playstate || "stopped";
        if (playstate != 'stopped' && !this.document.isOwner) {
            this.playSlide();
        }
    }

    async activateListeners(html) {
        await super.activateListeners(html);

        if (this.document._thumbnails == undefined && (game.user.isGM || this.document.testUserPermission(game.user, "OBSERVER")))
            this.loadThumbnails();

        const slideshowOptions = this._getSlideshowContextOptions();
        Hooks.call(`getMonksEnhancedJournalSlideshowContext`, html, slideshowOptions);
        if (slideshowOptions) new foundry.applications.ux.ContextMenu(html, ".slideshow-body .slide-inner", slideshowOptions, { fixed: true, jQuery: false });

        let that = this;
        $('.slideshow-body .slide', html)
            .click(this.activateSlide.bind(this))
            .dblclick(function (event) {
                let id = event.currentTarget.dataset.slideId;
                that.editSlide(id);
            });
        $('.slide-showing', html).click(this.advanceSlide.bind(this, 1)).contextmenu(this.advanceSlide.bind(this, -1));

        new ResizeObserver(() => {
            //change font size to match height
            let size = ($('.slide-showing .slide-textarea', html).outerWidth() || 182) / 50;
            $('.slide-showing .slide-textarea', html).css({ 'font-size': `${size}px`});
        }).observe(html);

        $('.add-slide', html).click(this.addSlide.bind(this));
        $('.nav-button.play').click(this.playSlideshow.bind(this));
        $('.nav-button.pause').click(this.pauseSlideshow.bind(this));
        $('.nav-button.stop').click(this.stopSlideshow.bind(this));

        let size = ($('.slideshow-body .slide-textarea', html).outerWidth() || 182) / 50;
        $('.slideshow-body .slide-textarea', html).css({ 'font-size': `${size}px` });
    }

    async close(options) {
        this.stopSlideshow();
        return super.close(options);
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.document.isOwner);
    }

    _onDragStart(event) {
        const li = event.currentTarget;

        const dragData = { from: this.document.uuid };

        let id = li.dataset.slideId;
        dragData.slideId = id;
        dragData.type = "Slide";

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal._dragItem = id;
    }

    _onDrop(event) {
        let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (this.document.flags["monks-enhanced-journal"].playstate == 'playing')
            return;

        let slides = foundry.utils.duplicate(this.document.flags['monks-enhanced-journal']?.slides || []);

        let from = slides.findIndex(a => a.id == data.slideId);
        let to = slides.length - 1;
        if (!$(event.target).hasClass('slideshow-body')) {
            const target = event.target.closest(".slide") || null;
            if (data.slideId === target.dataset.slideId) return; // Don't drop on yourself
            to = slides.findIndex(a => a.id == target.dataset.slideId);
        }
        if (from == to)
            return;

        slides.splice(to, 0, slides.splice(from, 1)[0]);

        this.document.flags['monks-enhanced-journal'].slides = slides;
        this.document.setFlag('monks-enhanced-journal', 'slides', slides);

        //$('.slideshow-body .slide[data-slide-id="' + data.slideId + '"]', this.trueElement).insertBefore(target);

        log('drop data', from, to, event, data);

        event.stopPropagation();
    }

    static doAddSlide(event, target) {
        this.addSlide();
    }

    addSlide(data = {}, options = { showdialog: true }) {
        if (this.document.flags["monks-enhanced-journal"].slides == undefined)
            this.document.flags["monks-enhanced-journal"].slides = [];

        let slide = foundry.utils.mergeObject({
            sizing: 'contain',
            font: {},
            background: { color: '' },
            texts: [],//{ color: '#FFFFFF', background: '#000000', align: 'center', valign: 'middle' },
            transition: { duration: 5, effect: 'fade' }
        }, (data instanceof Event || data?.originalEvent instanceof Event ? {} : data));
        

        if (options.showdialog)
            new SlideConfig({ document: slide, journalentry: this.document }).render(true);
        else {
            
            let slides = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].slides || []);
            slide.id = makeid();
            slides.push(slide);
            this.document._thumbnails[slide.id] = this.document._thumbnails[data.id] || null;
            this.document.setFlag("monks-enhanced-journal", 'slides', slides);

            let newSlide = MonksEnhancedJournal.createSlide(slide, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal"));
            let size = $('.slide-textarea', newSlide).outerWidth() / 50;
            $('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });
        }
    }

    static deleteAll() {
        if (this.document.flags["monks-enhanced-journal"].playstate != 'stopped')
            return ui.notifications.warn("Can't clear slides when a slideshow is playing");

        foundry.applications.api.DialogV2.confirm({
            window: {
                title: "Clear Slides",
            },
            content: "Are you sure want to clear all slides?",
            yes: {
                callback: () => {
                    this.document.setFlag("monks-enhanced-journal", 'slides', []);
                    //$(`.slideshow-body`, this.trueElement).empty();
                    //MonksEnhancedJournal.journal.saveData();
                },
            },
            defaultYes: true
        });
    }

    deleteSlide(id, html) {
        let slides = foundry.utils.duplicate(this.document.flags["monks-enhanced-journal"].slides || []);
        slides.findSplice(s => s.id == id);
        this.document.setFlag("monks-enhanced-journal", 'slides', slides);
    }

    cloneSlide(id) {
        let slide = this.document.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        let data = foundry.utils.duplicate(slide);
        this.addSlide(data, { showdialog: false });
    }

    editSlide(id, options) {
        let slide = this.document.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        if (slide != undefined)
            new SlideConfig({ document: slide, journalentry: this.document, slideElement: $(`.slide[data-slide-id="${id}"]`), ...options }).render(true);
    }

    activateSlide(event) {
        if (this.document.flags["monks-enhanced-journal"].playstate != 'stopped') {
            let idx = $(event.currentTarget).index();
            this.document.flags["monks-enhanced-journal"].slideAt = idx;
            this.playSlide(idx);
        }
    }

    _onSelectFile(selection, filePicker) {
        this.document.setFlag("monks-enhanced-journal", "audiofile", selection);
    }

    updateButtons() {
        $('.nav-button.play', this.trueElement).toggle(this.document.flags["monks-enhanced-journal"].playstate !== 'playing');
        $('.nav-button.pause', this.trueElement).toggle(this.document.flags["monks-enhanced-journal"].playstate === 'playing');
        $('.nav-button.stop', this.trueElement).toggle(this.document.flags["monks-enhanced-journal"].playstate !== 'stopped');
    }

    async playSlideshow(refresh = true) {
        let flags = this.document.flags["monks-enhanced-journal"];
        if (flags.slides.length == 0) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.CannotPlayNoSlides"));
            return;
        }

        if (this.enhancedjournal) {
            this.enhancedjournal.changeTab("slides", "primary", { navElement: $("nav.sheet-tabs.tabs", this.trueElement).get(0) });
        } else
            this.changeTab("slides", "primary", { navElement: $("nav.sheet-tabs.tabs", this.trueElement).get(0) });

        if (flags.playstate == 'playing')
            return;
        let currentlyPlaying;
        if (flags.playstate == 'stopped') {
            if (this.document.isOwner)
                await this.document.setFlag("monks-enhanced-journal", "slideAt", 0);
            else
                this.document.flags['monks-enhanced-journal'].slideAt = 0;
            this.document.sound = undefined;

            if (flags.audiofile != undefined && flags.audiofile != '') {
                let volume = flags.volume ?? 1;
                foundry.audio.AudioHelper.play({
                    src: flags.audiofile,
                    loop: flags.loopaudio,
                    volume: volume //game.settings.get("core", "globalInterfaceVolume")
                }).then((sound) => {
                    this.document.sound = sound;
                    MonksEnhancedJournal.sounds.push(sound);
                    sound.effectiveVolume = volume;
                    return sound;
                });
            }
            if (flags.pauseplaylist) {
                currentlyPlaying = ui.playlists._playing.playlists.map(ps => ps.playing ? ps.uuid : null).filter(p => !!p);
                for (let playing of currentlyPlaying) {
                    let sound = await fromUuid(playing);
                    sound.update({ playing: false, pausedTime: sound.sound.currentTime });
                }
            }
            if (flags.playlist != undefined) {
                let playlist = game.playlists.get(flags.playlist);
                if (playlist)
                    playlist.playAll();
            }
        } else {
            if (this.document.sound && this.document.sound.paused)
                this.document.sound.play();
        }

        let animate = (flags.playstate != 'paused');
        if (this.document.isOwner) {
            await this.document.setFlag("monks-enhanced-journal", "lastPlaying", currentlyPlaying);
            await this.document.setFlag("monks-enhanced-journal", "playstate", "playing");
        } else
            this.document.flags['monks-enhanced-journal'].playstate = "playing";
        $('.slide-showing .duration', this.trueElement).show();
        ($(this.trueElement).hasClass('slideshow-container') ? $(this.trueElement) : $('.slideshow-container', this.trueElement)).addClass('playing');
        this.updateButtons.call(this);

        //inform players
        if(game.user.isGM)
            MonksEnhancedJournal.emit('playSlideshow', { uuid: this.document.uuid, idx: flags.slideAt || 0 });

        if (refresh && flags.playstate == 'stopped')
            $('.slide-showing .slide', this.trueElement).remove();
        //add a loading slide
        $('<div>').addClass('loading-slide slide').appendTo($('.slide-showing', this.trueElement));

        this.playSlide(flags.slideAt, animate);
        //this.document.update({ 'flags.monks-enhanced-journal': this.document.flags["monks-enhanced-journal"] });
    }

    async pauseSlideshow() {
        let flags = this.document.flags["monks-enhanced-journal"];
        let slide = flags.slides[flags.slideAt || 0];
        if (slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        $('.slide-showing .duration', this.trueElement).hide().stop();

        if (this.document?._currentSlide?.transition?.timer)
            window.clearTimeout(this.document?._currentSlide?.transition?.timer);

        if(this.document.isOwner)
            await this.document.setFlag("monks-enhanced-journal", "playstate", "paused");
        else
            this.document.flags['monks-enhanced-journal'].playstate = "paused";
        this.updateButtons.call(this);

        if (this.document.slidesound?.src != undefined) {
            if (game.user.isGM)
                MonksEnhancedJournal.emit("stopSlideAudio");
            this.document.slidesound.stop();
            delete this.document.slidesound;
        }
    }

    async stopSlideshow() {
        let flags = this.document.flags["monks-enhanced-journal"] || {};
        let slide = foundry.utils.getProperty(flags, "slides.flags.slideAt");
        if (slide && slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        if (this.document.isOwner) {
            await this.document.setFlag("monks-enhanced-journal", "playstate", "stopped");
            await this.document.setFlag("monks-enhanced-journal", "slideAt", 0);
        } else {
            flags.playstate = "stopped";
            flags.slideAt = 0;
        }

        $('.slide-showing .duration', this.trueElement).hide().stop();
        if (this.document.isOwner) {
            $('.slide-showing .slide', this.trueElement).remove();
            ($(this.trueElement).hasClass('slideshow-container') ? $(this.trueElement) : $('.slideshow-container', this.trueElement)).removeClass('playing');
        }
        this.updateButtons.call(this);

        if (this.document.sound?.src != undefined) {
            if (game.user.isGM)
                MonksEnhancedJournal.emit("stopSlideshowAudio");
            this.document.sound.stop();
            this.document.sound = undefined;
        }
        if (this.document.slidesound?.src != undefined) {
            if (game.user.isGM)
                MonksEnhancedJournal.emit("stopSlideAudio");
            this.document.slidesound.stop();
            this.document.slidesound = undefined;
        }

        if (this.document.isOwner) {
            if (flags.playlist) {
                let playlist = game.playlists.get(flags.playlist);
                if (playlist && playlist.playing)
                    playlist.stopAll();
            }
            if (flags.lastPlaying) {
                for (let playing of flags.lastPlaying) {
                    let sound = await fromUuid(playing);
                    if (sound)
                        sound.parent?.playSound(sound);
                }
                this.document.unsetFlag("monks-enhanced-journal", "currentlyPlaying");
            }
        }

        //inform players
        if(game.user.isGM)
            MonksEnhancedJournal.emit('stopSlideshow', {});

        //++++ why am I doing it this way and not using setFlag specifically?
        //this.document.update({ 'flags.monks-enhanced-journal': this.document.flags["monks-enhanced-journal"] });
    }

    showSlide() {
        let idx = this.document.flags["monks-enhanced-journal"].slideAt || 0;
        let slide = this.document.flags["monks-enhanced-journal"].slides[idx];
        let newSlide = MonksEnhancedJournal.createSlide(slide, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal"));
        $('.slide-showing', this.trueElement).append(newSlide);
        let size = $('.slide-textarea', newSlide).outerWidth() / 50;
        $('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });
    }

    playSlide(idx, animate = true) {
        let that = this;
        if (idx == undefined)
            idx = this.document.flags["monks-enhanced-journal"].slideAt || 0;
        else { //if (idx != this.document.flags["monks-enhanced-journal"].slideAt)
            if (this.document.isOwner)
                this.document.setFlag("monks-enhanced-journal", "slideAt", idx);
            else
                this.document.flags['monks-enhanced-journal'].slideAt = idx;
        }

        let slides = this.document.flags["monks-enhanced-journal"].slides;
        idx = Math.clamp(idx, 0, slides.length - 1);

        let slide = this.document.flags["monks-enhanced-journal"].slides[idx];
        if (slide == undefined) {
            this.stopSlideshow();
            return;
        }

        //remove any that are still on the way out
        $('.slide-showing .slide.out', this.trueElement).remove();

        let effect = (slide.transition?.effect == 'fade' ? null : slide.transition?.effect) || this.document.flags['monks-enhanced-journal'].transition?.effect || 'none';

        //remove any old slides
        $('.slide-showing .slide', this.trueElement).addClass('out');

        //bring in the new slide
        let newSlide = MonksEnhancedJournal.createSlide(slide, foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal"));
        $('.slide-showing', this.trueElement).append(newSlide);
        let size = $('.slide-showing', this.trueElement).outerWidth() / 50;
        $('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });

        var img = $('.slide-image', newSlide);

        function loaded() {
            newSlide.removeClass('loading');
            log("Loaded slide image", img.attr('src'));
            $('.slide-showing .loading-slide', this.trueElement).remove();
            if (animate && effect != 'none' && $('.slide-showing .slide.out', that.trueElement).length) {
                let realeffect = effect;
                if (effect == 'slide-bump-left') {
                    realeffect = 'slide-slide-left';
                    $('.slide-showing .slide.out', that.trueElement).addClass('slide-slide-out-right');
                } else if (effect == 'slide-bump-right') {
                    realeffect = 'slide-slide-right';
                    $('.slide-showing .slide.out', that.trueElement).addClass('slide-slide-out-left');
                } else if (effect == 'slide-flip') {
                    realeffect = 'slide-flip-in';
                    $('.slide-showing .slide.out', that.trueElement).addClass('slide-flip-out');
                } else if (effect == 'slide-page-turn') {
                    realeffect = '';
                    $('.slide-showing .slide.out', that.trueElement).addClass('slide-page-out');
                    newSlide.css({ opacity: 1 });
                }
                newSlide.addClass(realeffect).on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function (evt) {
                    if ($(evt.target).hasClass('slide')) {
                        $('.slide-showing .slide.out', that.trueElement).remove();
                        newSlide.removeClass(realeffect);
                        if (that.document.slidesound?.src != undefined) {
                            if (game.user.isGM)
                                MonksEnhancedJournal.emit("stopSlideAudio");
                            that.document.slidesound.stop();
                            that.document.slidesound = undefined;
                        }
                        if (slide.audiofile != undefined && slide.audiofile != '') {
                            let volume = slide.volume ?? 1;
                            foundry.audio.AudioHelper.play({
                                src: slide.audiofile,
                                loop: false,
                                volume: volume //game.settings.get("core", "globalInterfaceVolume")
                            }).then((sound) => {
                                that.document.slidesound = sound;
                                MonksEnhancedJournal.sounds.push(sound);
                                sound.effectiveVolume = volume;
                                return sound;
                            });
                        }
                    }
                });
            } else {
                newSlide.css({ opacity: 1 });
                $('.slide-showing .slide.out', this.element).remove();
                if (that.document.slidesound?.src != undefined) {
                    if (game.user.isGM)
                        MonksEnhancedJournal.emit("stopSlideAudio");
                    that.document.slidesound.stop();
                    that.document.slidesound = undefined;
                }
                if (slide.audiofile != undefined && slide.audiofile != '') {
                    let volume = slide.volume ?? 1;
                    foundry.audio.AudioHelper.play({
                        src: slide.audiofile,
                        loop: false,
                        volume: volume //game.settings.get("core", "globalInterfaceVolume")
                    }).then((sound) => {
                        that.document.slidesound = sound;
                        MonksEnhancedJournal.sounds.push(sound);
                        sound.effectiveVolume = volume;
                        return sound;
                    });
                }
            }

            $(`.slideshow-body .slide:eq(${idx})`, this.trueElement).addClass('active').siblings().removeClass('active');
            $('.slideshow-body', this.trueElement).scrollLeft((idx * 116));
            $('.slide-showing .duration', this.trueElement).empty();

            if (this.document?._currentSlide?.transition?.timer)
                window.clearTimeout(this.document?._currentSlide?.transition?.timer);

            let duration = slide.transition?.duration ?? this.document.flags['monks-enhanced-journal'].transition?.duration ?? 0;
            duration = parseFloat(duration);
            if (isNaN(duration) || duration <= 0) {
                $('.slide-showing .duration', this.trueElement).append($('<div>').addClass('duration-label').html(i18n("MonksEnhancedJournal.ClickForNext")));
            } else {
                duration = Math.min(duration, )
                //set up the transition
                let time = duration * 1000;
                slide.transition.startTime = (new Date()).getTime();
                slide.transition.timer = window.setTimeout(function () {
                    if (that.document.getFlag("monks-enhanced-journal", "playstate") == 'playing')
                        that.advanceSlide.call(that, 1);
                }, time);
                $('.slide-showing .duration', this.trueElement).append($('<div>').addClass('duration-bar').css({ width: '0' }).show().animate({ width: '100%' }, time, 'linear'));
            }

            for (let text of slide.texts) {
                if ($.isNumeric(text.fadein)) {
                    let fadein = text.fadein + (effect != 'none' ? 1 : 0);
                    $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element)
                        .css({ 'animation-delay': fadein + 's' })
                        .addClass('text-fade-in')
                        .on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function () {
                            if ($.isNumeric(text.fadeout)) {
                                $(this).css({ 'animation-delay': text.fadeout + 's' }).removeClass('text-fade-in').addClass('text-fade-out');
                            }
                        });
                } else if ($.isNumeric(text.fadeout)) {
                    let fadeout = ($.isNumeric(text.fadein) ? text.fadein : 0) + (effect != 'none' ? 1 : 0) + text.fadeout;
                    $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).css({ 'animation-delay': fadeout + 's' }).addClass('text-fade-out');
                }
            }

            this.document._currentSlide = slide;

            if (game.user.isGM)
                MonksEnhancedJournal.emit('playSlide', { uuid: this.document.uuid, idx: idx });
        }

        if (img[0].complete || !img[0].paused) {
            loaded.call(this);
        } else {
            //img.on('play', loaded.bind(this));
            img.on('load', loaded.bind(this));
            img.on('loadeddata', loaded.bind(this));
            img.on('error', () => {
                loaded.call(this);
            })
        }
    }

    advanceSlide(dir, event) {
        let data = this.document.flags["monks-enhanced-journal"];
        data.slideAt = Math.max((data.slideAt || 0) + dir, 0);

        if (data.slideAt < 0)
            data.slideAt = 0;
        else if (data.slideAt >= data.slides.length) {
            if (data.loop === true) {
                data.slideAt = 0;
                this.playSlide(0, true);
            }
            else
                this.stopSlideshow();
        }
        else
            this.playSlide(data.slideAt, dir > 0);
    }

    _getSlideshowContextOptions() {
        return [
            {
                name: "MonksEnhancedJournal.EditSlide",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.document.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    //const options = { top: li[0].offsetTop, left: window.innerWidth - SlideConfig.defaultOptions.width };
                    this.editSlide(id); //, options);
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.document.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    return this.cloneSlide(id);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.document.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: `${game.i18n.localize("SIDEBAR.Delete")} slide`,
                        },
                        content: game.i18n.format("SIDEBAR.DeleteWarning", { type: 'slide' }),
                        yes: { callback: this.deleteSlide.bind(this, id) },
                        position: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720
                        }
                    });
                }
            }
        ];
    }
}

Hooks.on("renderSlideshowSheet", (sheet, html, data) => {
    if (sheet.object.flags['monks-enhanced-journal'].playstate != 'stopped') {
        sheet.playSlide();
    } else if (!sheet.object.isOwner) {
        sheet.showSlide();
    }
});
