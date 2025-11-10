import { registerSettings } from "./settings.js";
import { EnhancedJournal } from "./apps/enhanced-journal.js"
import { SlideshowViewer } from "./apps/slideshow-viewer.js"
import { ObjectiveDisplay } from "./apps/objective-display.js"
import { ListSheet } from "./sheets/ListSheet.js"
import { EncounterSheet } from "./sheets/EncounterSheet.js"
import { PersonSheet } from "./sheets/PersonSheet.js"
import { PictureSheet } from "./sheets/PictureSheet.js"
import { PlaceSheet } from "./sheets/PlaceSheet.js"
import { PointOfInterestSheet } from "./sheets/PointOfInterestSheet.js"
import { QuestSheet } from "./sheets/QuestSheet.js"
import { SlideshowSheet } from "./sheets/SlideshowSheet.js"
import { OrganizationSheet } from "./sheets/OrganizationSheet.js"
import { ShopSheet } from "./sheets/ShopSheet.js"
import { LootSheet } from "./sheets/LootSheet.js"
import { EventSheet } from "./sheets/EventSheet.js"
import { TextEntrySheet, TextImageEntrySheet } from "./sheets/TextEntrySheet.js"
import { NoteHUD } from "./classes/notehud.js"
import { getValue, setValue, setPrice, MEJHelpers } from "./helpers.js";
import { MEJFontHelper } from "./font-helper.js"
import { APSJ } from "./apsjournal.js";
import { EnhancedJournalSheet } from "./sheets/EnhancedJournalSheet.js";
import { ProseMirrorPlugin } from "./classes/prosemirror.js";

export let debugEnabled = 0;

export let debug = (...args) => {
	if (debugEnabled > 1) console.log("DEBUG: monks-enhanced-journal | ", ...args);
};
export let log = (...args) => console.log("monks-enhanced-journal | ", ...args);
export let warn = (...args) => {
	if (debugEnabled > 0) console.warn("monks-enhanced-journal | ", ...args);
};
export let error = (...args) => console.error("monks-enhanced-journal | ", ...args);
export let i18n = key => {
	return game.i18n.localize(key);
};
export let format = (key, data = {}) => {
	return game.i18n.format(key, data);
};
export let setting = key => {
	return game.settings.get("monks-enhanced-journal", key);
};

export let quantityname = () => {
	return MonksEnhancedJournal.quantityname
}
export let pricename = () => {
	return MonksEnhancedJournal.pricename;
}
export let currencyname = () => {
	return MonksEnhancedJournal.currencyname;
}

export let makeid = () => {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < 16; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

export let oldSheetClass = () => {
	return MonksEnhancedJournal._oldSheetClass;
};

export let getVolume = () => {
	if (game.modules.get("monks-sound-enhancement")?.active)
		return game.settings.get("core", "globalSoundEffectVolume");
	else
		return game.settings.get("core", "globalInterfaceVolume");
}

export let patchFunc = (prop, func, type = "WRAPPER") => {
	let nonLibWrapper = () => {
		const oldFunc = eval(prop);
		eval(`${prop} = function (event) {
			return func.call(this, ${type != "OVERRIDE" ? "oldFunc.bind(this)," : ""} ...arguments);
		}`);
	}
	if (game.modules.get("lib-wrapper")?.active) {
		try {
			libWrapper.register("monks-enhanced-journal", prop, func, type);
		} catch (e) {
			nonLibWrapper();
		}
	} else {
		nonLibWrapper();
	}
}

export class MonksEnhancedJournal {
	static _oldSheetClass;
	static journal;
	static sounds = [];

	static pricename = "price";
	static quantityname = "quantity";
	static currencyname = "currency";

	static includedTypes = ["armor", "consumable", "backpack", "equipment", "kit", "treasure", "weapon", "tool", "loot"];

	constructor() {
	}

	static getDocumentTypes() {
		return {
			list: ListSheet,
			encounter: EncounterSheet,
			event: EventSheet,
			organization: OrganizationSheet,
			person: PersonSheet,
			picture: PictureSheet,
			place: PlaceSheet,
			poi: PointOfInterestSheet,
			quest: QuestSheet,
			shop: ShopSheet,
			loot: LootSheet,
			slideshow: SlideshowSheet,
			journalentry: TextImageEntrySheet
		};
	}

	static getTypeLabels() {
		return {
			slideshow: "MonksEnhancedJournal.sheettype.slideshow",
			picture: "MonksEnhancedJournal.sheettype.picture",
			person: "MonksEnhancedJournal.sheettype.person",
			place: "MonksEnhancedJournal.sheettype.place",
			poi: "MonksEnhancedJournal.sheettype.poi",
			quest: "MonksEnhancedJournal.sheettype.quest",
			encounter: "MonksEnhancedJournal.sheettype.encounter",
			event: "MonksEnhancedJournal.sheettype.event",
			organization: "MonksEnhancedJournal.sheettype.organization",
			shop: "MonksEnhancedJournal.sheettype.shop",
			loot: "MonksEnhancedJournal.sheettype.loot",
			list: "MonksEnhancedJournal.sheettype.list",
			journalentry: "MonksEnhancedJournal.sheettype.journalentry"
		};
	}

	static get effectTypes() {
		return {
			'none': "MonksEnhancedJournal.effect.none",
			'slide-fade': "MonksEnhancedJournal.effect.slide-fade",
			'slide-fade-left': "MonksEnhancedJournal.effect.slide-fade-left",
			'slide-fade-right': "MonksEnhancedJournal.effect.slide-fade-right",
			'slide-zoom-in': "MonksEnhancedJournal.effect.slide-zoom-in",
			'slide-slide-left': "MonksEnhancedJournal.effect.slide-slide-left",
			'slide-slide-right': "MonksEnhancedJournal.effect.slide-slide-right",
			'slide-bump-left': "MonksEnhancedJournal.effect.slide-bump-left",
			'slide-bump-right': "MonksEnhancedJournal.effect.slide-bump-right",
			'slide-rotate': "MonksEnhancedJournal.effect.slide-rotate",
			'slide-hinge': "MonksEnhancedJournal.effect.slide-hinge",
			'slide-flip': "MonksEnhancedJournal.effect.slide-flip",
			'slide-page-turn': "MonksEnhancedJournal.effect.slide-page-turn"
		};
	}

	static emit(action, args = {}) {
		args.action = action;
		args.senderId = game.user.id;
		game.socket.emit(MonksEnhancedJournal.SOCKET, args, (resp) => { });
	}

	static getSystemPrice(item) {
		return MEJHelpers.getSystemPrice(item, MonksEnhancedJournal.pricename);
	}
	static getPrice(price) {
		return MEJHelpers.getPrice(price);
	}

	static getItemDetails(item) {
		let name = item.name;
		let img = item.img;

		let identifiedName = name;
		if (item.system?.identification?.status == "unidentified") {
			name = item.system?.identification.unidentified.name || name;
			img = item.system?.identification.unidentified.img || img;
		} else if (item.system?.identified === false) {
			name = item.system?.unidentified?.name || name;
		}

		return { name, img, identifiedName };
	}


	static getMEJType(journal) {
		let type = foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type");
		if (((journal instanceof JournalEntry && journal?.pages?.size == 1) || journal instanceof JournalEntryPage) && !!type) {
			if (type == "base" || type == "oldentry") type = "journalentry";
			let types = MonksEnhancedJournal.getDocumentTypes();
			if (!!types[type])
				return type;
		}
		return false;
	}

	static convertObjectToArray(obj) {
		let arr = [];
		for (let [k, v] of Object.entries(obj)) {
			arr.push({ id: k, ...v });
		}
		arr = arr.sort((a, b) => a.order - b.order);
		return arr;
	}

	static init() {
		log('Initializing Monks Enhanced Journal');
		registerSettings();

		function debugData(options) {
			debugger;
            return "";
		}

		Handlebars.registerHelper({
			debugData: debugData
		});

		try {
			Object.defineProperty(User.prototype, "isTheGM", {
				get: function isTheGM() {
					return this == (game.users.find(u => u.hasRole("GAMEMASTER") && u.active) || game.users.find(u => u.hasRole("ASSISTANT") && u.active));
				}
			});
		} catch { }

		MonksEnhancedJournal.registerSheetClasses();

		MonksEnhancedJournal.system = CONFIG[game.system.id.toUpperCase()];
		if (game.system.id == "tormenta20")
			MonksEnhancedJournal.system = CONFIG["T20"];

		if (game.system.id == "tormenta20") {
			MonksEnhancedJournal.pricename = "preco";
			MonksEnhancedJournal.quantityname = "qtd";
			MonksEnhancedJournal.currencyname = "dinheiro";
		} else if (game.system.id == "shadowrun5e") {
			MonksEnhancedJournal.pricename = "technology.cost";
			MonksEnhancedJournal.quantityname = "technology.quantity";
		} else if (game.system.id == "earthdawn4e") {
			MonksEnhancedJournal.currencyname = "money";
		} else if (game.system.id == "TheWitcherTRPG") {
			MonksEnhancedJournal.pricename = "cost";
		} else if (game.system.id == "fallout") {
			MonksEnhancedJournal.pricename = "cost";
		} else if (game.system.id == "swade") {
			MonksEnhancedJournal.pricename = "cost";
		} else if (game.system.id == "age-system") {
			MonksEnhancedJournal.pricename = "cost";
			MonksEnhancedJournal.currencyname = "";
		} else if (game.system.id == "archmage") {
			MonksEnhancedJournal.currencyname = "coins";
		} else if (game.system.id == "demonlord") {
			MonksEnhancedJournal.pricename = "value";
		}

		game.MonksEnhancedJournal = this;

		MonksEnhancedJournal.SOCKET = "module.monks-enhanced-journal";

		//MonksEnhancedJournal._oldSheetClass = CONFIG.JournalEntry.sheetClass;
		//CONFIG.JournalEntry.sheetClass = EnhancedJournalSheet;

		MEJFontHelper.loadFonts();
		//APSJ.init();

		const moreNoteIcons = {
			"Acid": "icons/svg/acid.svg",
			"Angel": "icons/svg/angel.svg",
			"Aura": "icons/svg/aura.svg",
			"Blind": "icons/svg/blind.svg",
			"Blood": "icons/svg/blood.svg",
			"Bones": "icons/svg/bones.svg",
			"Circle": "icons/svg/circle.svg",
			"Clockwork": "icons/svg/clockwork.svg",
			"Combat": "icons/svg/combat.svg",
			"Cowled": "icons/svg/cowled.svg",
			"Daze": "icons/svg/daze.svg",
			"Deaf": "icons/svg/deaf.svg",
			"Direction": "icons/svg/direction.svg",
			"Door-Closed": "icons/svg/door-closed.svg",
			"Door-Exit": "icons/svg/door-exit.svg",
			"Down": "icons/svg/down.svg",
			"Explosion": "icons/svg/explosion.svg",
			"Eye": "icons/svg/eye.svg",
			"Falling": "icons/svg/falling.svg",
			"Frozen": "icons/svg/frozen.svg",
			"Hazard": "icons/svg/hazard.svg",
			"Heal": "icons/svg/heal.svg",
			"Holy Shield": "icons/svg/holy-shield.svg",
			"Ice Aura": "icons/svg/ice-aura.svg",
			"Lightning": "icons/svg/lightning.svg",
			"Net": "icons/svg/net.svg",
			"Padlock": "icons/svg/padlock.svg",
			"Paralysis": "icons/svg/paralysis.svg",
			"Poison": "icons/svg/poison.svg",
			"Radiation": "icons/svg/radiation.svg",
			"Sleep": "icons/svg/sleep.svg",
			"Sound": "icons/svg/sound.svg",
			"Sun": "icons/svg/sun.svg",
			"Terror": "icons/svg/terror.svg",
			"Up": "icons/svg/up.svg",
			"Wing": "icons/svg/wing.svg"
		}
		Object.assign(CONFIG.JournalEntry.noteIcons, moreNoteIcons);

		CONFIG.JournalEntry.noteIcons = Object.entries(CONFIG.JournalEntry.noteIcons)
			.sort(([a,], [b,]) => a.localeCompare(b))
			.reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

		CONFIG.TextEditor.enrichers.push({ id: 'MonksEnhancedJournalPicture', pattern: new RegExp(`@(Picture)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g'), enricher: MonksEnhancedJournal._createPictureLink });

		foundry.canvas.placeables.Note.prototype._canHUD = function(user, event) {
			return game.user.isGM && this.entry;
		}

		Object.defineProperty(foundry.canvas.layers.NotesLayer.prototype, 'hud', {
			get: function () {
				return canvas.hud.note;
			}
		});

		/*
		if (JournalEntry.prototype.type == undefined) {
			Object.defineProperty(JournalEntry.prototype, 'type', {
				get: function () {
					return this.getFlag('monks-enhanced-journal', 'type') || 'base';
				}
			});
		}*/

		patchFunc("foundry.canvas.layers.TokenLayer.prototype._onClickRight", function (wrapper, ...args) {
			wrapper(...args);
			canvas.hud.note.close();
		});
		patchFunc("foundry.canvas.layers.TokenLayer.prototype._onClickLeft", function (wrapper, ...args) {
			wrapper(...args);
			canvas.hud.note.close();
		});

		patchFunc("foundry.canvas.placeables.Token.prototype._onClickRight", function (wrapper, ...args) {
			wrapper(...args);
			canvas.hud.note.close();
		});

		foundry.canvas.placeables.Note.prototype._onMouseOut = function (event) {
			canvas.hud.note.close();
		}

		let clickDocumentName = async function (wrapped, ...args) {
			let event = args[0];
			event.preventDefault();
			const element = event.target;
			const documentId = element.parentElement.dataset.entryId;
			const entry = this.collection.get(documentId);

			MonksEnhancedJournal.fixType(entry);

			let hasBlank = ["blank", "folder"].includes(MonksEnhancedJournal?.journal?.document?.type);
			let useOriginal = this._groupSelect || !!game.MonksActiveTiles?.waitingInput;
			let dontUseMEJ = event.altKey || useOriginal;
			if (!dontUseMEJ)
				dontUseMEJ = !await MonksEnhancedJournal.openJournalEntry(entry, { newtab: setting('open-new-tab') && !hasBlank });
			if (dontUseMEJ) {
				if (entry.pages.size == 1) {
					let page = entry.pages.contents[0];
					MonksEnhancedJournal.fixType(page);
					let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
					if (type == "base" || type == "oldentry") type = "journalentry";
					let types = MonksEnhancedJournal.getDocumentTypes();
					if (types[type]) {
						if (type == "picture" && !entry.testUserPermission(game.user, "OWNER")) {
							let defaultSettings = setting("sheet-settings");
							if (foundry.utils.getProperty(page, "flags.monks-enhanced-journal.sheet-settings.settings.open.value") === true || foundry.utils.getProperty(defaultSettings, "picture.settings.open.value") === true) {
								new foundry.applications.apps.ImagePopout({ src: page.src, window: { title: page?.name }, caption: page?.image.caption }).render(true);
								return;
							}
						} else if (!useOriginal)
							return page.sheet.render(true);
					}
				}
				return wrapped(...args);
			}
		}

		patchFunc("foundry.applications.sidebar.tabs.JournalDirectory.prototype._onClickEntry", clickDocumentName, "MIXED");

		patchFunc("foundry.applications.ui.Hotbar.prototype.constructor.toggleDocumentSheet", async (...args) => {
			const [uuid] = args;
			let doc = await fromUuid(uuid);
			if (!doc) {
				return ui.notifications.warn(game.i18n.format("WARNING.ObjectDoesNotExist", {
					name: game.i18n.localize("Document"),
					identifier: uuid
				}));
			}
			if (MonksEnhancedJournal.getMEJType(doc)) {
				if (! await MonksEnhancedJournal.openJournalEntry(doc)) {
					if (doc instanceof JournalEntry)
						doc = doc.pages.contents[0];
					MonksEnhancedJournal.fixType(doc);
				} else return;
			}
			const sheet = doc.sheet;
			return sheet.rendered ? sheet.close() : sheet.render(true);
		}, "OVERRIDE");

		patchFunc("foundry.applications.ui.Hotbar.prototype._createDocumentSheetToggle", async function (wrapper, ...args) {
			let macro = await wrapper.call(this, ...args);
			let doc = args[0];
			if (MonksEnhancedJournal.getMEJType(doc)) {
				let page = doc.pages.contents[0];
				await macro.update({ img: page.src });
			}
			return macro;
		});

		patchFunc("foundry.applications.sidebar.tabs.JournalDirectory.prototype._onDragStart", function (...args) {
			let event = args[0];
			event.stopPropagation();
			if (ui.context) ui.context.close({ animate: false });
			const li = event.currentTarget.closest(".directory-item");
			const documentName = this.constructor.DEFAULT_OPTIONS.collection;
			const isFolder = li.classList.contains("folder") && !li.classList.contains("journalentry");
			const doc = isFolder
				? game.folders.get(li.dataset.folderId)
				: CONFIG[documentName].collection.instance.get(li.dataset.entryId);
			const page = li.dataset.pageId ? doc.pages.get(li.dataset.pageId) : null;
			const dragData = page ? page.toDragData() : doc.toDragData();
			if (isFolder) foundry.utils.mergeObject(dragData, { documentName });
			event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		}, "OVERRIDE");

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.ignore_conflicts("monks-enhanced-journal", "monks-active-tiles", "foundry.applications.sidebar.tabs.JournalDirectory.prototype._onClickEntry");
			libWrapper.ignore_conflicts("monks-enhanced-journal", "multiple-document-selection", "foundry.applications.sidebar.tabs.JournalDirectory.prototype._onClickEntry");
			libWrapper.ignore_conflicts("monks-enhanced-journal", "multiple-document-selection", "foundry.applications.sidebar.apps.Compendium.prototype._onClickEntry");
			libWrapper.ignore_conflicts("monks-enhanced-journal", "sfrpg", "foundry.canvas.layers.TemplateLayer.prototype._onDragLeftStart");
		}

		let oldRenderPopout = foundry.applications.sidebar.tabs.JournalDirectory.prototype.renderPopout;
		foundry.applications.sidebar.tabs.JournalDirectory.prototype.renderPopout = async function () {
			if (! await MonksEnhancedJournal.openJournalEntry())
				return oldRenderPopout.call(this);
		}

		foundry.documents.collections.Journal.prototype.constructor._showEntry = async function(entryId, mode = null, force = true, showid) {
			let entry = await fromUuid(entryId);
			const options = { tempOwnership: force, mode: foundry.appv1.sheets.JournalSheet.VIEW_MODES.MULTIPLE, pageIndex: 0 };
			if (entry instanceof JournalEntryPage) {
				options.mode = foundry.appv1.sheets.JournalSheet.VIEW_MODES.SINGLE;
				options.pageId = entry.id;
				// Set temporary observer permissions for this page.
				entry.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
				entry = entry.parent;
			}
			else if (entry instanceof JournalEntry)
				entry.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
			else return;

			if (!force && !entry.visible) return;

			// Show the sheet with the appropriate mode
			if (! await MonksEnhancedJournal.openJournalEntry(entry, options)) {
				if (entry.pages.size == 1) {
					let page = entry.pages.contents[0];
					MonksEnhancedJournal.fixType(page);
					let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
					if (type == "base" || type == "oldentry") type = "journalentry";
					let types = MonksEnhancedJournal.getDocumentTypes();
					if (types[type]) {
						page.parent.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
						return page.sheet.render(true, options);//return new JournalEntrySheet(page, options).render(true, options);
					}
				}

				return entry.sheet.render(true, options);
			}
		}

		foundry.documents.collections.Journal.prototype.constructor.showDialog = async function (doc, options = {}) {
			if (!((doc instanceof JournalEntry) || (doc instanceof JournalEntryPage))) return;

			if (!doc.isOwner) return ui.notifications.error("JOURNAL.ShowBadPermissions", { localize: true });
			if (game.users.size < 2) return ui.notifications.warn("JOURNAL.ShowNoPlayers", { localize: true });

			const users = game.users.filter(u => u.id !== game.userId && (!options.users || options.users.includes(u.id)));
			const userCount = users.length;
			const ownership = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
			if (!doc.isEmbedded) ownership.shift();
			const levels = [
				{ level: CONST.DOCUMENT_META_OWNERSHIP_LEVELS.NOCHANGE, label: "OWNERSHIP.NOCHANGE" },
				...ownership.map(([name, level]) => ({ level, label: `OWNERSHIP.${name}` }))
			];
			MonksEnhancedJournal.fixType(doc);
			let hasImage = (doc instanceof JournalEntryPage) && ((["loot", "organization", "person", "place", "poi", "event", "quest", "shop", "picture", "journalentry"].includes(doc.type) || (doc.type === "image")) && !!doc.src);

			let showAs = doc.getFlag("monks-enhanced-journal", "showAs") || options?.showAs || (["image", "picture"].includes(doc.type) ? "image" : "journal");
			if (!hasImage && showAs != "journal")
				showAs = "journal";
			const html = await foundry.applications.handlebars.renderTemplate("modules/monks-enhanced-journal/templates/dialog-show.html", { users, levels, hasImage, showAs });

			return await foundry.applications.api.DialogV2.prompt({
				window: {
					title: game.i18n.format("JOURNAL.ShowEntry", { name: doc.name }),
				},
				classes: ["journal-show-dialog"],
				actions: {
					selectAll: (event, target) => {
						target.form.querySelectorAll('[name="players"]').forEach(i => {
							i.checked = true;
						});
					},
					deselectAll: (event, target) => {
						target.form.querySelectorAll('[name="players"]').forEach(i => {
							i.checked = false;
						});
					}
				},
                position: { width: 600 },
				label: game.i18n.localize("JOURNAL.ActionShow"),
				content: html,
				ok: {
					callback: async (event, button) => {
						const form = button.form;
						const fd = new foundry.applications.ux.FormDataExtended(form).object;
						const users = Array.from(form.querySelectorAll('[name="players"]:checked')).map(el => el.value);

						if (users.length == 0) {
							ui.notification.warn("Cannot share this Journal Entry as no users have been selected");
							return false;
						}

						let allUsers = (users.length == userCount);

						if (fd.ownership > -2) {
							let entity = doc;
							let types = MonksEnhancedJournal.getDocumentTypes();
							if (entity instanceof JournalEntryPage && entity.parent.pages.size == 1 && types[foundry.utils.getProperty(entity, "flags.monks-enhanced-journal.type")])
								entity = entity.parent;

							const ownership = entity.ownership;
							// if all the users have been selected, then change the default.
							if (allUsers) {
								ownership.default = fd.ownership;
							}
							users.forEach(id => {
								//If any users are less than the default, boost them up, and if greater and force is true, then bring them down.
								if ((ownership[id] < fd.ownership || fd.forceDowngrade) && (!allUsers || ownership[id] > CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT))
									ownership[id] = fd.ownership;
							});
							await entity.update({ ownership });
						}
						if (fd.showAs == "chatmessage") {
							//create a chat message
							let whisper = null;
							if (!allUsers) {
								whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
								whisper.push(...users);
							}
							let content = `<img src="${doc.src}" style="width: 300px;height: 300px;object-fit: contain;" />`;
							let messageData = {
								user: game.user.id,
								speaker: null,
								style: CONST.CHAT_MESSAGE_STYLES.OTHER,
								content: content,
								flavor: doc.name,
								whisper: whisper
							};

							ChatMessage.create(messageData, {});
						} else if (fd.showAs != "journal")
							return this.showImage(doc.src, {
								users,
								title: doc.name,
								showTitle: fd.showAs == "image",
								uuid: doc.uuid
							});
						else
							return this.show(doc, { force: true, users });
					}
				},
				rejectClose: false,
				options: { jQuery: false }
			});
		}

		/*
		let oldEnrichHTML = foundry.applications.ux.TextEditor.implementation.prototype.constructor.enrichHTML;
		foundry.applications.ux.TextEditor.implementation.prototype.constructor.enrichHTML = function (content, options = {}) {
			let { async } = options;
			let data = oldEnrichHTML.call(this, content, options);

			const html = document.createElement("div");
			html.innerHTML = async ? Promise.resolve(data) : String(data);

			$('a[href]', html).each(function () {
				if ($(this).attr('href').startsWith("#"))
					$(this).addClass("journal-link");
			});

			let updateTextArray = true;
			let text = [];

			if (options.documents) {
				if (updateTextArray) text = this._getTextNodes(html);
				const rgx = new RegExp(`@(Picture)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g');
				this._replaceTextContent(text, rgx, MonksEnhancedJournal._createPictureLink);
			}

			if (updateTextArray) text = this._getTextNodes(html);
			const rgx = /@(Request|Contested)\[([^\]]+)\](?:{([^}]+)})?/gi;
			this._replaceTextContent(text, rgx, MonksEnhancedJournal._createRequestRoll);

			return html.innerHTML;
		}*/

		/*
		let oldClickContentLink = foundry.applications.ux.TextEditor.implementation.prototype.constructor._onClickContentLink;
		foundry.applications.ux.TextEditor.implementation.prototype.constructor._onClickContentLink = async function (event) {
			event.preventDefault();
			const a = event.currentTarget;
			const app = a.closest('.app');
			let doc = null;
			let id = a.dataset.id;

			// Target 1 - Compendium Link
			if (a.dataset.pack) {
				const pack = game.packs.get(a.dataset.pack);
				if (a.dataset.lookup) {
					if (!pack.index.length) await pack.getIndex();
					const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
					if (entry) {
						a.dataset.id = id = entry.id;
						delete a.dataset.lookup;
					}
				}
				doc = id ? await pack.getDocument(id) : null;
			}

			// Target 2 - PlaylistSound Link
			else if (a.dataset.soundId) {
				const playlist = game.playlists.get(a.dataset.playlistId);
				doc = playlist?.sounds.get(a.dataset.soundId);
			}

			// Target 3 - World Document Link
			else {
				const collection = game.collections.get(a.dataset.type);
				if (!collection)
					return;
				doc = collection.get(id);
				if (!doc) return;
				if ((doc.documentName === "Scene") && doc.journal) doc = doc.journal;
				if (!doc.testUserPermission(game.user, "LIMITED")) {
					return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: doc.documentName}));
				}
			}
			if (!doc) return;

			// Action 1 - Execute an Action
			if (doc.documentName === "Macro") {
				if (!doc.testUserPermission(game.user, "LIMITED")) {
					return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentUsePermissions", { documentName: doc.documentName}));
				}
				return doc.execute();
			}

			// Action 2 - Play the sound
			else if (doc.documentName === "PlaylistSound") return foundry.applications.ux.TextEditor.implementation._onPlaySound(doc);

			// Action 3 - Render the Entity sheet
			if (doc.documentName == 'Actor' || doc.documentName == 'JournalEntry' || doc.documentName == 'JournalEntryPage') {
				if (event.altKey || setting('open-outside') || ["SFDialog", "forge-compendium-browser"].includes(app?.id) || !MonksEnhancedJournal.openJournalEntry(doc, { newtab: event.ctrlKey && !setting("open-new-tab"), anchor: a.dataset.anchor })) {
					if (doc.documentName == 'JournalEntry') {
						if (doc.pages.size == 1) {
							let page = doc.pages.contents[0];
							let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
							if (type == "base" || type == "oldentry") type = "journalentry";
							let types = MonksEnhancedJournal.getDocumentTypes();
							if (types[type]) {
								MonksEnhancedJournal.fixType(page);
								return page.sheet.render(true, { anchor: a.dataset.anchor });
							}
						}
					}
					return doc.sheet.render(true, { anchor: a.dataset.anchor });
				}
			}
			else {
				if (doc.documentName === "Scene") {
					let scene = game.scenes.get(id);
					if (event.ctrlKey)
						scene.activate();
					else
						scene.view();
				} else
					return doc.sheet.render(true);
			}
		}
		*/
		Actor.prototype._onClickDocumentLink = async function (event) {
			if (event.altKey || setting('open-outside') || ! await MonksEnhancedJournal.openJournalEntry(this, { newtab: event.ctrlKey && !setting("open-new-tab") })) {
				return this.sheet.render(true);
			}
		}
		Scene.prototype._onClickDocumentLink = function (event) {
			if (this.journal) {
				if (MonksEnhancedJournal.getMEJType(this.journal) == "slideshow")
					return this.journal._onClickDocumentLink(event);
			}
			if (event.ctrlKey)
				this.activate();
			else
				this.view();
		}
		JournalEntry.prototype._onClickDocumentLink = async function (event) {
			const target = event.currentTarget;

			//|| ["SFDialog", "forge-compendium-browser"].includes(app?.id)
			if (event.altKey || setting('open-outside') || ! await MonksEnhancedJournal.openJournalEntry(this, { newtab: event.ctrlKey && !setting("open-new-tab"), anchor: target.dataset.hash })) {
				if (this.pages.size == 1) {
					let page = this.pages.contents[0];
					let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
					if (type == "base" || type == "oldentry") type = "journalentry";

					let types = MonksEnhancedJournal.getDocumentTypes();
					if (types[type]) {
						MonksEnhancedJournal.fixType(page);
						return page.sheet.render(true, { anchor: target.dataset.hash });
					}
				}
				return this.sheet.render(true, { anchor: target.dataset.hash });
			}
		}
		JournalEntryPage.prototype._onClickDocumentLink = async function (event) {
			const target = event.currentTarget;

			if (event.altKey || setting('open-outside') || ! await MonksEnhancedJournal.openJournalEntry(this.parent, { newtab: event.ctrlKey && !setting("open-new-tab"), pageId: this.id, anchor: target.dataset.hash })) {
				let type = foundry.utils.getProperty(this, "flags.monks-enhanced-journal.type");
				if (type == "base" || type == "oldentry") type = "journalentry";

				let types = MonksEnhancedJournal.getDocumentTypes();
				if (types[type]) {
					MonksEnhancedJournal.fixType(page);
					return page.sheet.render(true, { anchor: target.dataset.hash });
				} else
					return this.parent.sheet.render(true, { pageId: this.id, anchor: target.dataset.hash });
			}
		}

		CONFIG.JournalEntry.documentClass.defaultName = function ({ type, parent, pack } = {}) {
			const documentName = this.metadata.name;
			let collection;
			if (parent) collection = parent.getEmbeddedCollection(documentName);
			else if (pack) collection = game.packs.get(pack);
			else collection = game.collections.get(documentName);
			const takenNames = new Set();
			for (const document of collection) takenNames.add(document.name);
			let baseNameKey = this.metadata.label;
			if (type) {
                type = type.split(":")[0];
				let types = MonksEnhancedJournal.getDocumentTypes();
				if (types[type]) {
					const typeNameKey = `MonksEnhancedJournal.sheettype.${type}`;
					if (typeNameKey && game.i18n.has(typeNameKey)) baseNameKey = typeNameKey;
				}
			}
			const baseName = game.i18n.localize(baseNameKey);
			let name = baseName;
			let index = 1;
			while (takenNames.has(name)) name = `${baseName} (${++index})`;
			return name;
		}
		/*
		let oldOnClickEntry = foundry.applications.sidebar.apps.Compendium.prototype._onClickEntry;
		foundry.applications.sidebar.apps.Compendium.prototype._onClickEntry = async function (event) {
			let li = event.currentTarget.parentElement;
			const document = await this.collection.getDocument(li.dataset.documentId);
			if (document instanceof JournalEntry) {
				MonksEnhancedJournal.openJournalEntry(document, { editable: game.user.isGM && !this.collection.locked });
			} else
				return oldOnClickEntry.call(this, event);
		}*/

		let clickCompendiumEntry = async function (wrapped, ...args) {
			let event = args[0];
			let li = event.currentTarget.parentElement;
			const document = await this.collection.getDocument(li.dataset.entryId);
			if (document instanceof JournalEntry) {
				if (! await MonksEnhancedJournal.openJournalEntry(document, { editable: game.user.isGM && !this.collection.locked })) {
					if (document.pages.size == 1) {
						let page = document.pages.contents[0];
						MonksEnhancedJournal.fixType(page);
						let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
						if (type == "base" || type == "oldentry") type = "journalentry";
						let types = MonksEnhancedJournal.getDocumentTypes();
						if (types[type]) {
							return page.sheet.render(true);
						}
					}

					return wrapped(...args);
				}
			} else
				return wrapped(...args);
		}

		patchFunc("foundry.applications.sidebar.apps.Compendium.prototype._onClickEntry", clickCompendiumEntry, "MIXED");

		let updateJournalEntryPage = async function (wrapped, ...args) {
			let [data, context] = args;

			let oldtype;
			let types = MonksEnhancedJournal.getDocumentTypes();
			if (types[this.type]) {
				//oldtype = this.type;
				//data.type = "text";
                delete data.type;
			}
			let result = await wrapped(data, context);
			if (oldtype)
				this.type = oldtype;

			if (data.img != undefined && this.parent) {
				this.parent.update({ "flags.monks-enhanced-journal.img": data.img });
			}

			return result;
		}
		patchFunc("JournalEntryPage.prototype.update", updateJournalEntryPage, "WRAPPER");

		patchFunc("JournalEntryPage.prototype.getEmbeddedDocument", function (wrapped, ...args) {
			let [embeddedName, id] = args;

			MonksEnhancedJournal.fixType(this);
			let type = foundry.utils.getProperty(this, "flags.monks-enhanced-journal.type");
			if (type == "base" || type == "oldentry") type = "journalentry";
			let types = MonksEnhancedJournal.getDocumentTypes();

			if (types[type]) {
				if (embeddedName == "Items") {
					let items = foundry.utils.getProperty(this, "flags.monks-enhanced-journal.items") || {};
					let item = items[id];
					if (item) {
						return new Item(item);
					}
				} else if (embeddedName == "Rewards") {
					let rewards = foundry.utils.getProperty(this, "flags.monks-enhanced-journal.rewards");
					let reward = rewards.find(r => r.id == id);
					if (reward) {
						return foundry.utils.mergeObject({
							getEmbeddedDocument: function (embeddedName, id) {
								if (embeddedName == "Items") {
									let item = this.items[id];
									if (item) {
										return new Item(item);
									}
								}
							}
						}, reward);
					}
				}
			}

			return wrapped(...args);
		}, "MIXED");

		patchFunc("JournalEntry.prototype._onCreate", async function (wrapped, ...args) {
			let [data, options, userid] = args;
			if (game.user.id !== userid)
				return;

			let document = this;// game.journal.get(data._id);

			// Pre create a new page
			let type = foundry.utils.getProperty(data, "flags.monks-enhanced-journal.pagetype");
			if (game.modules.get("storyteller")?.active) {
				let types = game.StoryTeller.constructor.types;
				if (types[type] != undefined) {
					// This is a storyteller page, it can be ignored.
					return wrapped(...args);
				}
			}
			if (game.modules.get("conversation-hud")?.active && type == "conversation-sheet") {
				const permissions = {};
				game.users?.forEach((u) => (permissions[u.id] = game.user?.id === u.id ? 3 : 0));

				document.update({
					flags: {
						"core": { sheetClass: "conversation-sheet.ConversationSheet" },
						"conversation-hud": { type: "conversation-sheet" }
					},
                    ownership: permissions
				});

				let dataToSave = {
					"type": "gm-controlled",
					"background": "",
					"conversation": {
						"data": {
							"participants": []
						},
						"features": {
							"isMinimized": false,
							"isMinimizationLocked": false,
							"isSpeakingAs": false,
							"isBackgroundVisible": true
						}
					}
				}

				await document.createEmbeddedDocuments("JournalEntryPage", [
					{
						text: { content: JSON.stringify(dataToSave) },
						name: "_chud_conversation_data",
						flags: {
							"conversation-hud": { type: "conversation-sheet-data" },
						},
					},
				]);
				return false;
			}
			if (type) {
				let subtype = "";
				if (type.indexOf(":") != -1) {
					subtype = type.split(":")[1];
                    type = type.split(":")[0];
				}
				if (data.pages.length == 0) {
					let pageData = { type: type, name: data.name };
					let types = MonksEnhancedJournal.getDocumentTypes();
					if (type == "base" || type == "oldentry") type = "journalentry";
					if (types[type]) {
						foundry.utils.setProperty(pageData, "flags.monks-enhanced-journal.type", type);
						if (subtype)
							foundry.utils.setProperty(pageData, "flags.monks-enhanced-journal.subtype", subtype);
						pageData.type = "text";
					}
					await document.setFlag("monks-enhanced-journal", "img", `modules/monks-enhanced-journal/assets/${type}.png`);
					let page = await JournalEntryPage.create(pageData, { parent: document });
					if (types[type]) {
						page.type = type;
					}
				} else {
					window.setTimeout(async () => {
						await MonksEnhancedJournal.fixPage(document);
						ui.journal.render();
					}, 500);
				}
			}
			if (!!foundry.utils.getProperty(this, "flags.forien-quest-log") || (options.renderSheet !== false && !await MonksEnhancedJournal.openJournalEntry(this, options)))
				return wrapped(...args);
		}, "MIXED");

		/*
		patchFunc("JournalEntryPage.prototype._onCreate". async function (wrapped, ...args) {
			let [data, options, userid] = args;
			if (game.user.id !== userid)
				return;

			if (!!foundry.utils.getProperty(this, "flags.forien-quest-log") || (MonksEnhancedJournal.compendium !== true && ! await MonksEnhancedJournal.openJournalEntry(this, options)))
				return wrapped(...args);
		}, "MIXED");
		*/

		patchFunc("foundry.appv1.sheets.JournalTextPageSheet.prototype.onAutosave", function (...args) {
			this.document.parent?._sheet?.render(false);
		}, "OVERRIDE");

		let getPageData = function (wrapped, ...args) {
			let pages = wrapped(...args);

			let start = 0;

			if (pages.length == 0)
				return pages;

			if (pages[0].type == "image" && !pages[0].title.show) {
				pages[0].numberIcon = 'fa-image';
				start = 1;

				if (pages.length > 1 && pages[1].type == "text" && !pages[1].title.show) {
					pages[1].numberIcon = 'fa-list';
					start = 2;
				}
			} else if (pages[0].type == "text" && !pages[0].title.show) {
				pages[0].numberIcon = 'fa-list';
				start = 1;
			}

			function nextChar(c) {
				return String.fromCharCode(c.charCodeAt(0) + 1);
			}

			let appendixAt = 'A';
			let pageAt = 1;
			for (let i = start; i < pages.length; i++) {
				pages[i].number = (foundry.utils.getProperty(pages[i], "flags.monks-enhanced-journal.appendix") ? appendixAt : pageAt++);
				if (foundry.utils.getProperty(pages[i], "flags.monks-enhanced-journal.appendix"))
					appendixAt = nextChar(appendixAt);
			}

			return pages;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.appv1.sheets.JournalSheet.prototype._getPageData", getPageData, "WRAPPER");
		} else {
			const oldGetPageData = foundry.appv1.sheets.JournalSheet.prototype._getPageData;
			foundry.appv1.sheets.JournalSheet.prototype._getPageData = function (event) {
				return getPageData.call(this, oldGetPageData.bind(this), ...arguments);
			}
		}

		let pageGetSubmitData = function (wrapped, ...args) {
			let data = wrapped(...args);

			if (data["title.level"] == "-1") {
				data["flags.monks-enhanced-journal.appendix"] = true;
				data["title.level"] = "1";
			} else {
				data["flags.monks-enhanced-journal.appendix"] = false;
			}

			return data;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.appv1.sheets.JournalPageSheet.prototype._getSubmitData", pageGetSubmitData, "WRAPPER");
		} else {
			const oldPageSubmit = foundry.appv1.sheets.JournalPageSheet.prototype._getSubmitData;
			foundry.appv1.sheets.JournalPageSheet.prototype._getSubmitData = function (event) {
				return pageGetSubmitData.call(this, oldPageSubmit.bind(this), ...arguments);
			}
		}

		let sceneActivate = function (wrapped, ...args) {
			if (MonksEnhancedJournal.getMEJType(this.journal) == 'slideshow') {
				if (game.user.isGM) {
					//start slideshow for everyone
					let page = this.journal.pages.contents[0];
					MonksEnhancedJournal.fixType(page);
					const cls = (page._getSheetClass ? page._getSheetClass() : null);
					const sheet = new cls(page, { render: false });
					if (sheet.playSlideshow)
						sheet.playSlideshow();
					MonksEnhancedJournal.openJournalEntry(this.journal);
				}
			}
			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "Scene.prototype.activate", sceneActivate, "WRAPPER");
		} else {
			const oldSceneActivate = Scene.prototype.activate;
			Scene.prototype.activate = function (event) {
				return sceneActivate.call(this, oldSceneActivate.bind(this), ...arguments);
			}
		}

		let onTemplateDragStart = function (wrapped, ...args) {
			if (this.encounterTemplate) return;
			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.layers.TemplateLayer.prototype._onDragLeftStart", onTemplateDragStart, "MIXED");
		} else {
			const oldTemplateDragStart = foundry.canvas.layers.TemplateLayer.prototype._onDragLeftStart;
			foundry.canvas.layers.TemplateLayer.prototype._onDragLeftStart = function (event) {
				return onTemplateDragStart.call(this, oldTemplateDragStart.bind(this), ...arguments);
			}
		}

		/*
		let oldOnCreateDocument = foundry.applications.sidebar.tabs.JournalDirectory.prototype._onCreateDocument;
		foundry.applications.sidebar.tabs.JournalDirectory.prototype._onCreateDocument = async function (event) {
			let result = oldOnCreateDocument.call(this, event).then((html) => {
				log('create document', html);
			});
			log(result);
		}*/

		let stripData = function(data) {
			if (data.flags['monks-enhanced-journal'] != undefined) {
				for (let [k, v] of Object.entries(data.flags['monks-enhanced-journal'])) {
					if (v?.notes != undefined)
						delete data.flags['monks-enhanced-journal'][k];
				}

				if (data.flags['monks-enhanced-journal']?.type == 'encounter' && data.flags['monks-enhanced-journal'].items) {
					for (let item of data.flags['monks-enhanced-journal'].items) {
						delete item.received;
					}
				}
			}

			return data;
		}

		let oldToCompendium = JournalEntry.prototype.toCompendium;
		JournalEntry.prototype.toCompendium = function (pack) {
			return stripData(oldToCompendium.call(this, pack));
		}

		let oldImportDocument = foundry.documents.collections.CompendiumCollection.prototype.importDocument;
		foundry.documents.collections.CompendiumCollection.prototype.importDocument = function (document, options = {}) {
			options.renderSheet = false;
			if (document instanceof JournalEntry && document.pages.size == 1 && !!foundry.utils.getProperty(document.pages.contents[0], "flags.monks-enhanced-journal.type")) {
				let type = foundry.utils.getProperty(document.pages.contents[0], "flags.monks-enhanced-journal.type");
				if (type == "base" || type == "oldentry") type = "journalentry";
				let types = MonksEnhancedJournal.getDocumentTypes();
				if (types[type]) {
					foundry.utils.setProperty(document, "_source.flags.monks-enhanced-journal.pagetype", type);
					foundry.utils.setProperty(document, "_source.flags.monks-enhanced-journal.img", document.pages.contents[0].src);
				}
			}

			MonksEnhancedJournal.fixType(this.object);
			return oldImportDocument.call(this, document, options);
		}

		let oldImportFromCompendium = foundry.documents.collections.Journal.prototype.importFromCompendium;
		foundry.documents.collections.Journal.prototype.importFromCompendium = async function (collection, id, updateData = {}, options = {}) {
			options.renderSheet = false;
			return oldImportFromCompendium.call(this, collection, id, updateData, options);
		}

		patchFunc("DocumentSheet.prototype._onConfigureSheet", async function (wrapped, ...args) {
			if (this.enhancedjournal)
				this.document.enhancedjournal = this.enhancedjournal;
			return wrapped(...args);
		});

		let clickNote2 = async function (wrapped, ...args) {
			const options = { newtab: setting("open-new-tab")};
			if (this.page) {
				options.mode = foundry.appv1.sheets.JournalSheet.VIEW_MODES.SINGLE;
				options.pageId = this.page.id;
				options.anchor = (foundry.utils.getProperty(this.document, "flags.monks-enhanced-journal.anchor") || "").slugify().replace(/["']/g, "").substring(0, 64);
			}

			const allowed = Hooks.call("activateNote", this, options);

			let entity = this.page || this.entry;
			if (allowed && this.entry) {
				if (! await MonksEnhancedJournal.openJournalEntry(this.entry, options)) {
					let page = this.page;
					if (this.entry.pages.size == 1) {
						page = this.entry.pages.contents[0];
						MonksEnhancedJournal.fixType(page);
					}
					let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
					if (type == "base" || type == "oldentry") type = "journalentry";
					let types = MonksEnhancedJournal.getDocumentTypes();

					if (this.entry.testUserPermission(game.user, "OBSERVER")) {
						if (types[type])
							return page.sheet.render(true);
						else
							return this.entry.sheet.render(true, options);
					}
					else if (this.entry.testUserPermission(game.user, "LIMITED")) {
						if ((page.type == "image" || page.type == "picture") && page.src) {
							const title = page?.name;
							const ip = new foundry.applications.apps.ImagePopout({ src: page.src, window: { title }, caption: page?.image.caption });
							ip.render(true);
						}
					} else
						return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentname: this.entry.documentName}));
				}
			}
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.placeables.Note.prototype._onClickLeft2", clickNote2, "OVERRIDE");
		} else {
			const oldClickNote = foundry.canvas.placeables.Note.prototype._onClickLeft2;
			foundry.canvas.placeables.Note.prototype._onClickLeft2 = function (event) {
				return clickNote2.call(this, oldClickNote.bind(this));
			}
		}

		let noteCanView = function (wrapped, ...args) {
			if (!this.entry) return false;
			if (game.user.isGM) return true;
			if (this.page?.testUserPermission(game.user, "LIMITED", { exact: true })) {
				// Special-case handling for image pages.
				return this.page?.type === "image" || foundry.utils.getProperty(this.page, "flags.monks-enhanced-journal.type") == "picture";
			}
			const accessTest = this.page ? this.page : this.entry;
			return accessTest.testUserPermission(game.user, "OBSERVER");
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.placeables.Note.prototype._canView", noteCanView, "OVERRIDE");
		} else {
			const oldCanView = foundry.canvas.placeables.Note.prototype._canView;
			foundry.canvas.placeables.Note.prototype._canView = function (event) {
				return noteCanView.call(this, oldCanView.bind(this));
			}
		}

		let clickNote = function (wrapped, ...args) {
			if ((setting("show-chat-bubbles") || !game.user.isGM) && this.document.flags['monks-enhanced-journal']?.chatbubble) {
				let journal = game.journal.get(this.document.entryId);
				if (journal && !journal.testUserPermission(game.user, "OBSERVER"))
					MonksEnhancedJournal.showAsChatBubble(this, journal, this.document.pageId);
			}
			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.placeables.Note.prototype._onClickLeft", clickNote, "WRAPPER");
		} else {
			const oldClickNote = foundry.canvas.placeables.Note.prototype._onClickLeft;
			foundry.canvas.placeables.Note.prototype._onClickLeft = function (event) {
				return clickNote.call(this, oldClickNote.bind(this), ...arguments);
			}
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.placeables.Note.prototype._canControl", clickNote, "WRAPPER");
		} else {
			const oldOnCanControl = foundry.canvas.placeables.Note.prototype._canControl;
			foundry.canvas.placeables.Note.prototype._canControl = function (event) {
				return clickNote.call(this, oldOnCanControl.bind(this), ...arguments);
			}
		}

		let onCanControlToken = function (wrapped, ...args) {
			if ((setting("show-chat-bubbles") || !game.user.isGM) && this.document.flags['monks-enhanced-journal']?.chatbubble) {
				let journal = game.journal.get(this.document.flags['monks-enhanced-journal']?.chatbubble);
				if (journal)
					MonksEnhancedJournal.showAsChatBubble(this, journal);
			}
			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.placeables.Token.prototype._canControl", onCanControlToken, "WRAPPER");
		} else {
			const oldOnCanControl = foundry.canvas.placeables.Token.prototype._canControl;
			foundry.canvas.placeables.Token.prototype._canControl = function (event) {
				return onCanControlToken.call(this, oldOnCanControl.bind(this), ...arguments);
			}
		}

		patchFunc("JournalEntryPage.prototype._onSheetChange", async function (wrapped, ...args) {
			MonksEnhancedJournal.fixType(this);
			if (!!MonksEnhancedJournal.getMEJType(this)) {
				let [sheetOpen] = args;
				sheetOpen ??= this.sheet.rendered;
				await Promise.all(Object.values(this.apps).map(app => app.close()));
				this._sheet = null;
				if (sheetOpen) {
					if (this.enhancedjournal)
						this.enhancedjournal.render(true);
					else
						this.sheet.render(true);
				}
			} else
				return wrapped(...args);
		}, "MIXED");

		let onSceneContextMenu = function (wrapped, ...args) {
			let context = wrapped(...args);

			let menu = context.find(c => c.name == "SCENES.Notes");
			if (menu) {
				menu.callback = async (li) => {
					const scene = game.scenes.get(li.data("sceneId"));
					const entry = scene.journal;
					const pageId = scene.journalEntryPage;
					if (entry) {
						if (! await MonksEnhancedJournal.openJournalEntry(entry, { pageId })) {
							const sheet = entry.sheet;
							sheet.options.sheetMode = "text";
							sheet.render(true);
						}
					}
				}
			}

			return context;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.applications.ui.SceneNavigation.prototype._getContextMenuOptions", onSceneContextMenu, "WRAPPER");
		} else {
			const oldSceneContextMenu = foundry.applications.ui.SceneNavigation.prototype._getContextMenuOptions;
			foundry.applications.ui.SceneNavigation.prototype._getContextMenuOptions = function (event) {
				return onSceneContextMenu.call(this, oldSceneContextMenu.bind(this), ...arguments);
			}
		}

		let notesCreatePreview = async function (wrapped, ...args) {
			let [noteData] = args;
			// Acquire Journal entry
			let entry = game.journal.get(noteData.entryId);

			if (entry?.pages.size == 1) {
				let page = entry.pages.contents[0];
				noteData.pageId = page.id;

				MonksEnhancedJournal.fixType(page);

				if (page.type == 'shop')
					noteData.texture = { src: "icons/svg/hanging-sign.svg" };
				else if (page.type == 'loot')
					noteData.texture = { src: page.src || "icons/svg/chest.svg" };
				else if (page.type == 'encounter')
					noteData.texture = { src: "icons/svg/sword.svg" };
				else if (page.type == 'place')
					noteData.texture = { src: "icons/svg/village.svg" };
				else if (page.type == 'person')
					noteData.texture = { src: "icons/svg/cowled.svg" };

			}

			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.canvas.layers.NotesLayer.prototype._createPreview", notesCreatePreview, "WRAPPER");
		} else {
			const oldCreatePreview = foundry.canvas.layers.NotesLayer.prototype._createPreview;
			foundry.canvas.layers.NotesLayer.prototype._createPreview = function (event) {
				return notesCreatePreview.call(this, oldCreatePreview.bind(this), ...arguments);
			}
		}

		//Make sure that players can't see inline links that they don't know about.
		let createContentLink = function (wrapped, ...args) {
			let [match, options] = args;
			let { async, relativeTo } = (options || {});
			let [type, target, hash, name] = match.slice(1, 5);
			let parts = [target];
			if (type == "JournalEntry") {
				parts = target.split('#');
			}
			if (setting("hide-inline")) {
				let doc;
				if (CONST.WORLD_DOCUMENT_TYPES.includes(type)) {
					const collection = game.collections.get(type);

					doc = /^[a-zA-Z0-9]{16}$/.test(parts[0]) ? collection.get(parts[0]) : collection.getName(parts[0]);
				} else if (type == "UUID") {
					if (async) {
						try {
							doc = fromUuid(target, relativeTo);
						} catch (err) {
						}
					} else {
						try {
							doc = fromUuidSync(target, relativeTo);
						} catch (err) {
						}
					}
				}

				const checkPermission = doc => {
					if (!game.user.isGM && doc && ((!doc.compendium && doc.testUserPermission && !doc.testUserPermission(game.user, "LIMITED")) || (doc.compendium && !doc.compendium.testUserPermission(game.user, "OBSERVER")))) {
						const span = document.createElement('span');
						span.classList.add("unknown-link");
						span.innerHTML = `<i class="fas fa-eye-slash"></i> Hidden`;
						return span;
					} else {
						let a = wrapped.call(this, match, options);
						if (parts.length > 1) {
							$(a).attr("data-anchor", parts[1]).append(`, ${parts[1]}`);
						}
						return a;
					}
				}
				if (doc instanceof Promise) return doc.then(checkPermission).catch((err) => { checkPermission(); })
				else return checkPermission(doc);
			}

			let a = wrapped.call(this, match, options);
			if (parts.length > 1) {
				$(a).attr("data-anchor", parts[1]).append(`, ${parts[1]}`);
			}
			return a;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.applications.ux.TextEditor.implementation._createContentLink", createContentLink, "MIXED");
		} else {
			const oldCreateContentLink = foundry.applications.ux.TextEditor.implementation._createContentLink;
			foundry.applications.ux.TextEditor.implementation._createContentLink = function (event) {
				return createContentLink.call(this, oldCreateContentLink.bind(this), ...arguments);
			}
		}

		let onCreateDialog = async function (wrapped, ...args) {
			let [data, createOptions, options] = args;
			options.journalentry = true;
			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "JournalEntry.prototype.constructor.createDialog", onCreateDialog, "WRAPPER");
		} else {
			const oldCreateDialog = JournalEntry.prototype.constructor.createDialog;
			JournalEntry.prototype.constructor.createDialog = function (event) {
				return onCreateDialog.call(this, oldCreateDialog.bind(this), ...arguments);
			}
		}

		let onCreatePageDialog = async function (wrapped, ...args) {
			let [data, createOptions, options] = args;
			options.journalentrypage = true;
			return wrapped(...args);
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "JournalEntryPage.prototype.constructor.createDialog", onCreatePageDialog, "WRAPPER");
		} else {
			const oldCreateDialog = JournalEntryPage.prototype.constructor.createDialog;
			JournalEntryPage.prototype.constructor.createDialog = function (event) {
				return onCreatePageDialog.call(this, oldCreateDialog.bind(this), ...arguments);
			}
		}

		let journalSheetContext = function (wrapped, ...args) {
			const getPage = li => this.document.pages.get(li.data("page-id"));

			let context = wrapped(...args);
			context.push({
				name: "Extract",
				icon: '<i class="fas fa-file-arrow-down"></i>',
				condition: li => getPage(li)?.isOwner,
				callback: async (li) => {
					const page = getPage(li);
					if (page) {
						let data = this.document.toObject();
						data.name = page.name;
						let pageData = page.toObject();
						delete pageData._id;
						data.pages = [pageData];
						delete data._id;
						let newDoc = await JournalEntry.create(data);

						//page.delete();

						MonksEnhancedJournal.openJournalEntry(newDoc);
					}
				}
			});
			return context;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.appv1.sheets.JournalSheet.prototype._getEntryContextOptions", journalSheetContext, "WRAPPER");
		} else {
			const oldContext = foundry.appv1.sheets.JournalSheet.prototype._getEntryContextOptions;
			foundry.appv1.sheets.JournalSheet.prototype._getEntryContextOptions = function (event) {
				return journalSheetContext.call(this, oldContext.bind(this), ...arguments);
			}
		}

		let onDirectoryContextMenu = function (wrapped, ...args) {
			let context = wrapped(...args);

			context.push({
				name: i18n("MonksEnhancedJournal.ConvertToEnhancedJournal"),
				icon: '<i class="fas fa-file-arrow-down"></i>',
				condition: li => {
					let journal = game.journal.get(li.dataset.entryId);
					if (!journal)
						return false;

					if (!journal.isOwner)
						return false;

					return !MonksEnhancedJournal.getMEJType(journal);
				},
				callback: async (li) => {
					let journal = game.journal.get(li.dataset.entryId);
					if (journal) {
						let isGood = true;
						if (journal.pages.size > 1) {
							isGood = await foundry.applications.api.DialogV2.confirm({
								window: {
									title: "Confirm Page Deletion",
								},
								content: `<div class="flexrow"><div style="padding: 10px;padding-right: 20px;font-size:40px; color: #ffc107; flex-grow: 0"><i class="fas fa-exclamation-triangle"></i></div><div>This Journal has more than one page.  Monk's Enhanced Journal only uses one page, so the additional pages will be deleted and cannot be recovered.</div></div> <br><div style="text-align: center;padding-bottom: 10px;">Are you <b>sure</b> you wish to continue?</div></br>`
							});
						}

						if (journal.pages.size == 0) {
							isGood = await foundry.applications.api.DialogV2.confirm({
								window: {
									title: "Confirm Page Creation",
								},
								content: "This Journal has no pages.  Monk's Enhanced Journal requires at least one page, so a page will be created. <br><br>Are you sure you wish to continue?"
							});
							if (isGood) {
								let type = foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type") || "journalentry";
								let pageData = { type: type, name: journal.name };
								foundry.utils.setProperty(pageData, "flags.monks-enhanced-journal.type", type);
								await JournalEntryPage.create(pageData, { parent: journal });
							}
						}

						if (isGood) {
							while (journal.pages.size > 1) {
								await journal.pages.contents[1].delete();
							}
							let page = journal.pages.contents[0];
							let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
							if (type == "base" || type == "oldentry") type = "journalentry";
							let types = MonksEnhancedJournal.getDocumentTypes();
							if (!types[type])
								await page.setFlag("monks-enhanced-journal", "type", (journal.type == "image" ? "picture" : "journalentry"));

							page._sheet = null;
							await ui.sidebar.tabs.journal.render(true);
						}
					}
				}
			});

			if (setting("open-outside")) {
				context.push({
					name: i18n("MonksEnhancedJournal.OpenInEnhancedBrowser"),
					icon: '<i class="fas fa-link"></i>',
					condition: li => {
						return game.user.isGM || setting("allow-player");
					},
					callback: async (li) => {
						let journal = game.journal.get(li.dataset.entryId);
						if (journal) {
							MonksEnhancedJournal.fixType(journal);
							if (! await MonksEnhancedJournal.openJournalEntry(journal, { newtab: setting("open-new-tab") }))
								journal.sheet.render(true);
						}
					}
				});
			} else {
				context.push({
					name: i18n("MonksEnhancedJournal.OpenOutsideEnhancedBrowser"),
					icon: '<i class="fas fa-link"></i>',
					condition: li => {
						return game.user.isGM || setting("allow-player");
					},
					callback: async (li) => {
						let journal = game.journal.get(li.dataset.entryId);
						if (journal) {
							if (!!MonksEnhancedJournal.getMEJType(journal)) {
								let page = journal.pages.contents[0];
								MonksEnhancedJournal.fixType(page);
								page.sheet.render({ force: true });
							} else
								journal.sheet.render({ force: true });
						}
					}
				});
			}

			if (!setting("open-new-tab")) {
				context.push({
					name: i18n("MonksEnhancedJournal.OpenInNewTab"),
					icon: '<i class="fas fa-external-link-alt"></i>',
					condition: li => {
						return game.user.isGM || setting("allow-player");
					},
					callback: async (li) => {
						let journal = game.journal.get(li.dataset.entryId);
						if (journal) {
							MonksEnhancedJournal.fixType(journal);
							if (! await MonksEnhancedJournal.openJournalEntry(journal, { newtab: true }))
								journal.sheet.render(true);
						}
					}
				});
			}

			return context;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.applications.sidebar.tabs.JournalDirectory.prototype._getEntryContextOptions", onDirectoryContextMenu, "WRAPPER");
		} else {
			const oldDirectoryContextMenu = foundry.applications.sidebar.tabs.JournalDirectory.prototype._getEntryContextOptions;
			foundry.applications.sidebar.tabs.JournalDirectory.prototype._getEntryContextOptions = function (event) {
				return onDirectoryContextMenu.call(this, oldDirectoryContextMenu.bind(this), ...arguments);
			}
		}

		let journalSheetDrop = async function (wrapped, ...args) {
			let result = await wrapped(...args);

			if (!this._canDragDrop()) return;

			// Retrieve the dropped Journal Entry Page
			const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
			if (data.type == "JournalEntry") {
				const entry = await JournalEntry.implementation.fromDropData(data);

				const createData = [];
				if (entry.pages.size == 1 && (!!foundry.utils.getProperty(entry.pages.contents[0], "flags.monks-enhanced-journal.type") || !!foundry.utils.getProperty(entry, "flags.monks-enhanced-journal.type"))) {
					let type = foundry.utils.getProperty(entry.pages.contents[0], "flags.monks-enhanced-journal.type") || foundry.utils.getProperty(entry, "flags.monks-enhanced-journal.type");
					if (type == "base" || type == "oldentry") type = "journalentry";
					let types = MonksEnhancedJournal.getDocumentTypes();
					if (types[type]) {
						let pageData = entry.pages.contents[0].toObject();
						if (pageData.src && pageData.type == "text") {
							let imgPage = foundry.utils.duplicate(pageData);
							imgPage.type = "image";
							imgPage.name = imgPage.name + " Image";
							delete imgPage._id;
							createData.push(imgPage);
						}
						if (this.document.pages.has(pageData._id)) delete pageData._id;
						createData.push(pageData);
						return this.document.createEmbeddedDocuments("JournalEntryPage", createData, { keepId: true });
					}
				}

				for (let page of entry.pages) {
					let pageData = page.toObject();
					if (this.document.pages.has(page.id)) delete pageData._id;
					createData.push(pageData);
				}

				return this.document.createEmbeddedDocuments("JournalEntryPage", createData, { keepId: true });
			}

			return result;
		}

		if (game.modules.get("lib-wrapper")?.active) {
			libWrapper.register("monks-enhanced-journal", "foundry.appv1.sheets.JournalSheet.prototype._onDrop", journalSheetDrop, "WRAPPER");
		} else {
			const oldDrop = foundry.appv1.sheets.JournalSheet.prototype._onDrop;
			foundry.appv1.sheets.JournalSheet.prototype._onDrop = function (event) {
				return journalSheetDrop.call(this, oldDrop.bind(this), ...arguments);
			}
		}

		Handlebars.registerHelper({ selectGroups: MonksEnhancedJournal.selectGroups });
	}

	static async fixItems(reset = false) {
		let isFix = false;

		let doFix = async (items, actor) => {
			return (await Promise.all(Object.values(items).map(async (i) => {
				if (i._id) return i;
				//if (i?.uuid?.indexOf('Actor') >= 0) return null;

				let doc;
				if (i.uuid)
					doc = await fromUuid(i.uuid);
				else {
					doc = game.items.get(i.id);
					if (!doc && actor)
						doc = actor.items.get(i.id);
				}

				if (doc) {
					isFix = true;
					let item = doc.toObject();
					item.system[MonksEnhancedJournal.quantityname] = (item.system[MonksEnhancedJournal.quantityname]?.hasOwnProperty("value") ? { value: i.qty } : i.qty);
					item.system[MonksEnhancedJournal.pricename] = (item.system[MonksEnhancedJournal.pricename]?.hasOwnProperty("value") ? { value: i.price } : i.price);

					if (i.cost != undefined)
						item.system.cost = i.cost;
					if (i.remaining != undefined)
						item.system.remaining = i.remaining;
					if (i.lock != undefined)
						item.lock = i.lock;
					if (i.hide != undefined)
						item.hide = i.hide;
					if (i.received != undefined)
						item.received = i.received;
					if (i.assigned != undefined)
						item.assigned = i.assigned;

					return item;
				}
			}))).filter(i => !!i);
		}

		for (let journal of game.journal) {
			let type = journal.getFlag('monks-enhanced-journal', 'type');
			if (["shop", "encounter", "quest"].includes(type)) {
				isFix = false;
				if (type == "quest") {
					let rewardFix = false;
					let rewards = foundry.utils.duplicate(journal.getFlag('monks-enhanced-journal', 'rewards') || []);
					for (let reward of rewards) {
						isFix = false;

						if (reset && reward.olditems)
							reward.items = reward.olditems;

						let olditems = reward.items || [];
						let items = await doFix(olditems);
						if (isFix) {
							rewardFix = true;
							reward.olditems = olditems;
							reward.items = items;
						}
					}

					if (rewardFix)
						await journal.setFlag('monks-enhanced-journal', 'rewards', rewards);
				} else {
					if (reset) {
						if (journal.getFlag('monks-enhanced-journal', 'olditems'))
							await journal.setFlag('monks-enhanced-journal', 'items', journal.getFlag('monks-enhanced-journal', 'olditems'));
					}

					let olditems = journal.getFlag('monks-enhanced-journal', 'items') || {};
					let actor;
					if (type == 'shop' && journal.getFlag('monks-enhanced-journal', 'actor')) {
						let actorData = journal.getFlag('monks-enhanced-journal', 'actor');
						if (actorData.id) {
							actorData = actorData.id;
							await journal.setFlag('monks-enhanced-journal', 'actor', actorData);
						}

						actor = game.actors.get(actorData);
					}

					let items = await doFix(olditems, actor);
					if (isFix) {
						await journal.setFlag('monks-enhanced-journal', 'olditems', olditems);
						await journal.setFlag('monks-enhanced-journal', 'items', items);
					}
				}

				if (type == "encounter") {
					let fixMonsters = false;
					let monsters = journal.getFlag('monks-enhanced-journal', 'actors') || [];
					for (let monster of monsters) {
						if (monster.qty) {
							monster.quantity = monster.qty;
							delete monster.qty;
							fixMonsters = true;
						}
					}
					if (fixMonsters)
						await journal.setFlag('monks-enhanced-journal', 'actors', monsters);
				}
			} else if (type == "person") {
				//+++fix the actor
			}
		}
	}

	static async fixRelationships() {
		if (setting('fix-relationships')) {
			for (let journal of game.journal) {
				if (["person", "place"].includes(journal.type) && journal.getFlag('monks-enhanced-journal', 'relationships') == undefined) {
					let actors = journal.getFlag('monks-enhanced-journal', 'actors') || [];
					let shops = journal.getFlag('monks-enhanced-journal', 'shops') || [];
					await journal.setFlag('monks-enhanced-journal', 'relationships', actors.concat(shops));
					//journal.unsetFlag('monks-enhanced-journal', 'actors');
				}

				//check to make sure the relationships go both ways
				if (["person", "place", "organization", "shop", "quest"].includes(journal.type)) {
					let relationships = journal.getFlag('monks-enhanced-journal', 'relationships') || [];
					for (let relationship of relationships) {
						let other = game.journal.get(relationship.id);
						if (other) {
							let refs = foundry.utils.duplicate(other.getFlag("monks-enhanced-journal", "relationships") || []);
							if (!refs.find(r => r.id == journal.id)) {
								log(`Fixing ${other.name}, adding relationship with ${journal.name}`);
								refs.push({ id: journal.id, hidden: relationship.hidden });
								other.setFlag("monks-enhanced-journal", "relationships", refs);
							}
						}
					}
				}
			}
		}
	}

	static async fixv13() {
		if (setting('fix-v13')) {
			for (let journal of game.journal) {
				if (journal.pages.contents.length == 1) {
					let page = journal.pages.contents[0];
                    let type = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type");
					if (type != "list") {
						for (let collection of ["relationships", "actors", "items", "rewards", "objectives"]) {
							let elements = page.getFlag('monks-enhanced-journal', collection);
							if (elements) {
								let changes = false;
								let elementObj = elements;
								if (elements instanceof Array) {
									elementObj = {};
									// Convert the array to an object
									for (let rel of elements) {
										if (rel._id) {
											elementObj[rel._id] = rel;
										} else if (rel.id) {
											elementObj[rel.id] = rel;
										}
									}
									changes = true;
								}

								if (changes)
									await page.setFlag('monks-enhanced-journal', collection, elementObj);
							}
						}

						//fix rewards items
						let rewards = page.getFlag('monks-enhanced-journal', "rewards");
						if (rewards) {
							let items = page.getFlag('monks-enhanced-journal', "items") || {};
							for (let reward of Object.values(rewards)) {
								reward.oldItems = reward.items || [];
								reward.itemIds = [];
								for (let item of (reward.items || [])) {
									let id = item._id;
									if (id && !Object.keys(items).includes(id)) {
										items[id] = item;
										reward.itemIds.push(id);
									}
								}
								delete reward.items;
								reward["-=items"] = null;
							}
							await page.setFlag('monks-enhanced-journal', "rewards", rewards);
							await page.setFlag('monks-enhanced-journal', "items", items);
						}
					} else {
						// convert items to entries
						let items = page.getFlag('monks-enhanced-journal', "items");
						if (items) {
							let entries = items;
							if (!(items instanceof Array)) {
								entries = [];
								for (let [k, v] of Object.entries(items)) {
									v.id = k;
									entries.push(v);
								}
							}

							await page.setFlag('monks-enhanced-journal', "entries", entries);
						}
					}
				}
			}
		}
	}

	static async cleanPageState() {
		let tabs = (game.user.getFlag("monks-enhanced-journal", "tabs") || []).map(t => {
			if (!t.entityId)
				return null;
			let parts = t.entityId.split(".");
			return parts[parts.length - 1];
		}).filter(t => !!t);
		let pagestate = foundry.utils.duplicate(game.user.getFlag("monks-enhanced-journal", "pagestate") || {});
		let deleteIds = [];
		for (let [k, v] of Object.entries(pagestate)) {
			if (!tabs.includes(k))
				deleteIds.push(k);
		}
		if (deleteIds.length) {
			for (let id of deleteIds) {
				delete pagestate[id];
			}
			await game.user.unsetFlag("monks-enhanced-journal", "pagestate");
			await game.user.setFlag("monks-enhanced-journal", "pagestate", pagestate);
		}
	}

	static async fixPages() {
		for (let journal of game.journal) {
			if (foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type") != undefined) {
				MonksEnhancedJournal.fixPage(journal);
			}
		}

		if (setting("loot-entity").length == 16) {
			let sheet = setting("loot-sheet");
			let entity = game[sheet == "monks-enhanced-journal" ? journal : actors].get(setting("loot-entity"));
			if (entity) {
				if (entity instanceof JournalEntry) {
					let page = entity.pages.find(p => foundry.utils.getProperty(p, "flags.monks-enahnced-journal.type") == "loot");
					entity = page || entity;
				}
				game.settings.set("monks-enhanced-journal", "loot-entity", entity?.uuid);
			}
		} else if (setting("loot-entity") == "create") {
			let folder = game.folders.get(setting("loot-folder"));
			game.settings.set("monks-enhanced-journal", "loot-entity", folder?.uuid);
		}
	}

	static async fixPage(document) {
		if (!document)
			return;

		let types = MonksEnhancedJournal.getDocumentTypes();

		// fix the splitting of Journal Entry pages
		let type = foundry.utils.getProperty(document, "flags.monks-enhanced-journal.type");
		let flags = foundry.utils.getProperty(document, "flags.monks-enhanced-journal");
		if (type == "base") {
			type = "journalentry";
			flags.type = type;
		}
		if (!!type && document.pages.size == 0) {
			await JournalEntryPage.create({ name: document.name, type: "text", flags: { "monks-enhanced-journal": flags } }, { parent: document, render: false });
		} else if (document.pages.size < 3 && type != "oldentry" && types[type]) {
			let picturePage = document.pages.find(p => p.type == "image");
			let textPage = document.pages.find(p => p.type == "text");
			if (textPage) {
				if (type == "picture") {
					await textPage.delete();
					await picturePage.update({ name: document.name, flags: { "monks-enhanced-journal": flags } });
				} else {
					await textPage.update({ name: document.name, src: picturePage?.src, flags: { "monks-enhanced-journal": flags } });
					if (picturePage)
						await picturePage.delete();
				}
			} else if (picturePage) {
				await picturePage.update({ name: document.name, flags: { "monks-enhanced-journal": flags } });
			}
		}
		for (let page of document.pages) {
			let journalFlags = document.flags['monks-enhanced-journal'];
			if (journalFlags.items) {
				for (let item of journalFlags.items) {
					if (item.data) {
						let data = item.data;
						delete item.data;
						item.system = data;
						let quantity = getValue(item, quantityname()) ?? getValue(item.system, quantityname());
						let price = MEJHelpers.getPrice(MEJHelpers.getSystemPrice(item, "price"));
						item.flags = foundry.utils.mergeObject((item.flags || {}), {
							"monks-enhanced-journal": {
								remaining: item.system?.remaining,
								received: item.received,
								lock: item.lock,
								hide: item.hide,
								from: item.from,
								assigned: item.assigned,
								price: `${price.value} ${price.currency}`,
								cost: item.system?.cost,
								quantity: quantity
							}
						});
						foundry.utils.setProperty(item, "system." + quantityname(), 1);
					}
				}
			}
			if (journalFlags.rewards) {
				for (let reward of journalFlags.rewards) {
					for (let item of reward.items) {
						if (item.data) {
							let data = item.data;
							delete item.data;
							item.system = data;
							let quantity = getValue(item, quantityname()) ?? getValue(item.system, quantityname());
							let price = MEJHelpers.getPrice(MEJHelpers.getSystemPrice(item, "price"));
							item.flags = foundry.utils.mergeObject((item.flags || {}), {
								"monks-enhanced-jorunal": {
									remaining: item.system.remaining,
									received: item.received,
									lock: item.lock,
									hide: item.hide,
									from: item.from,
									assigned: item.assigned,
									price: `${price.value} ${price.currency}`,
									cost: item.system.cost,
									quantity: quantity
								}
							});
							foundry.utils.setProperty(item, "system." + quantityname(), 1);
						}
					}
				}
			}
			await page.update({ flags: { "monks-enhanced-journal": journalFlags } });
		}
	}

	static async fixChecklist() {
		if (setting('fix-checklist')) {
			for (let journal of game.journal) {
				if (MonksEnhancedJournal.getMEJType(journal) == "checklist") {
					let page = journal.pages.contents[0];
					await page.update({ flags: { "monks-enhanced-journal": { type: "list" }, core: { sheetClass: "monks-enhanced-journal.CheckListSheet" } } });
				}
			}
		}
	}

	static async fixPersonAttributes() {
		if (setting('fix-person')) {
			for (let journal of game.journal) {
				if (MonksEnhancedJournal.getMEJType(journal) == "person") {
					let page = journal.pages.contents[0];

					let attributes = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.attributes") || {};
					if (attributes.race && !attributes.race?.hidden && attributes.race?.value && !attributes.ancestry) {
						attributes.ancestry = { value: attributes.race.value };
						if (attributes.race.hidden === false)
							attributes.race.hidden = true;
					}

					await page.update({ flags: { "monks-enhanced-journal": { attributes: attributes } } });
				}
			}
		}
	}

	static async fixAdjustments() {
		if (setting('fix-adjustment')) {
			let defaultAdjustments = setting('adjustment-defaults');
			defaultAdjustments.default = foundry.utils.mergeObject({ sell: 1, buy: 0.5 }, defaultAdjustments.default);
			for (let journal of game.journal) {
				if (MonksEnhancedJournal.getMEJType(journal) == "shop") {
					let page = journal.pages.contents[0];

					let adjustment = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.adjustment") || {};
					let defValue = {
						sell: adjustment.default?.sell ?? foundry.utils.getProperty(page, "flags.monks-enhanced-journal.sell"),
						buy: adjustment.default?.buy ?? foundry.utils.getProperty(page, "flags.monks-enhanced-journal.buy")
					};

					if (defValue.sell || defValue.buy) {
						if (defValue.sell && defValue.sell == defaultAdjustments.default.sell) delete defValue.sell;
						if (defValue.buy && defValue.buy == defaultAdjustments.default.buy) delete defValue.buy;
						if (Object.keys(defValue).length != 0) {
							adjustment.default = defValue;
							await page.update({ flags: { "monks-enhanced-journal": { adjustment: adjustment } } });
						}
					}
				}
			}
		}
	}

	static async fixSheetSettings() {
		if (setting('fix-sheet-settings')) {
			let changes = {};
			let settings = setting('sheet-settings');

			let adjustmentDefaults = setting('adjustment-defaults');
			foundry.utils.setProperty(settings, "shop.adjustment", foundry.utils.mergeObject((settings?.shop?.adjustment || {}), adjustmentDefaults));

			let personDefaults = setting('person-attributes');
			//use reduce to turn the array into an object
			let order = 0;
			changes = personDefaults.reduce((obj, item) => {
				obj[item.id] = {
					name: item.name,
					order: order++,
					shown: !item.hidden,
					full: item.full
				};
				return obj;
			}, {});
			foundry.utils.setProperty(settings, "person.attributes", foundry.utils.mergeObject(settings.person.attributes, changes));

			let placeDefaults = setting('place-attributes');
			//use reduce to turn the array into an object
			order = 0;
			changes = placeDefaults.reduce((obj, item) => {
				obj[item.id] = {
					name: item.name,
					order: order++,
					shown: !item.hidden,
					full: item.full
				};
				return obj;
			}, {});
			foundry.utils.setProperty(settings, "place.attributes", foundry.utils.mergeObject(settings.place.attributes, changes));

			await game.settings.set("monks-enhanced-journal", "sheet-settings", settings);

			let defaultSettings = foundry.utils.mergeObject(foundry.utils.duplicate((game.settings.settings.get("monks-enhanced-journal.sheet-settings")?.default || {}) || {}), foundry.utils.duplicate((setting("sheet-settings") || {}) || {}));

			for (let journal of game.journal) {
				let type = MonksEnhancedJournal.getMEJType(journal);
				let page = journal.pages.contents[0];
				if (["person", "place"].includes(type)) {
					if (foundry.utils.hasProperty(page, "flags.monks-enhanced-journal.attributes")) {
						// check to make sure the attributes are formatted correctly
						let changedObjectValues = false;
						let sheetSettings = {};
						let attributes = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.attributes") || {};
						for (let [k, v] of Object.entries(attributes)) {
							if (typeof v == "object") {
								if (v.hidden != undefined && defaultSettings[type].attributes[k].shown == v.hidden)
									sheetSettings[k] = { shown: !v.hidden };
								attributes[k] = v.value;
								changedObjectValues = true;
							}
						}
						if (changedObjectValues) {
							if (Object.keys(sheetSettings).length)
								await page.update({ 'monks-enhanced-journal.flags.sheet-settings.attributes': sheetSettings });
							await page.setFlag('monks-enhanced-journal', 'attributes', attributes);
						}
					}
				} else if (type == "shop") {
					if (foundry.utils.hasProperty(page, "flags.monks-enhanced-journal.adjustment")) {
						let adjustment = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.adjustment") || {};
						await page.update({ 'monks-enhanced-journal.flags.sheet-settings.adjustment': adjustment });
					}
				}
			}
		}
	}

	static async fixListType() {
		if (setting('fix-list-sheet')) {
			for (let journal of game.journal) {
				let type = MonksEnhancedJournal.getMEJType(journal);
				let page = journal.pages.contents[0];
				if (type == "list") {
					if (!page.getFlag("monks-enhanced-journal", "subtype"))
					{
						MonksEnhancedJournal.fixType(page);
						let sheetClass = page.getFlag("core", "sheetClass");
						let subtype = "basic";
						if (sheetClass == "monks-enhanced-journal.CheckListSheet")
							subtype = "checklist";
						if (sheetClass == "monks-enhanced-journal.ProgressListSheet")
							subtype = "progress";
						if (sheetClass == "monks-enhanced-journal.PollListSheet")
							subtype = "poll";

						await page.setFlag("monks-enhanced-journal", "subtype", subtype);
						await page.unsetFlag("core", "sheetClass");
					}

					if (page.getFlag("monks-enhanced-journal", "subtype") == "poll") {
						let items = foundry.utils.duplicate(page.getFlag("monks-enhanced-journal", "items") || []);
						let changed = false;
						for (let item of items) {
                            let players = item.players || [];
							item.players = {};
							for (let p of players) {
								item.players[p] = true;
							}
							if (players.length)
                                changed = true;
						}
						if (changed)
                            await page.setFlag("monks-enhanced-journal", "items", items);
					}
				}
			}
		}
	}

	static registerSheetClasses() {
		let types = MonksEnhancedJournal.getDocumentTypes();
		let labels = MonksEnhancedJournal.getTypeLabels();

		game.documentTypes.JournalEntryPage

		for (let [k, v] of Object.entries(labels)) {
			if (CONFIG.JournalEntryPage.sheetClasses[k] == undefined)
				CONFIG.JournalEntryPage.sheetClasses[k] = {};
			foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", types[k] || foundry.appv1.sheets.JournalPageSheet, {
				types: [k],
				makeDefault: true,
				label: i18n(v)
			});
		}
		foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", TextImageEntrySheet, {
			types: ["journalentry"],
			makeDefault: false,
			label: "Text and Image"
		});
		/*
		foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", CheckListSheet, {
			types: ["list"],
			makeDefault: false,
			label: "Checklist"
		});
		foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", PollListSheet, {
			types: ["list"],
			makeDefault: false,
			label: "Poll"
		});
		foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", ProgressListSheet, {
			types: ["list"],
			makeDefault: false,
			label: "Progress"
		});
		*/

		if (!CONFIG.JournalEntryPage.dataModels)
			CONFIG.JournalEntryPage.dataModels = {};
		//game.system.documentTypes.JournalEntryPage = game.system.documentTypes.JournalEntryPage.concat(Object.keys(types)).sort();
		CONFIG.JournalEntryPage.typeLabels = foundry.utils.mergeObject((CONFIG.JournalEntryPage.typeLabels || {}), labels);
	}

	static showAsChatBubble(object, journal, pageId) {
		if (!journal || !journal.pages || journal.pages.size == 0)
			return;

		let page;

		if (!!MonksEnhancedJournal.getMEJType(journal)) {
			page = journal.pages.contents[0];
		}
		if (pageId && !page) {
			journal.pages.get(pageId);
		}

		if (!page)
			return;

		let text = '';
		if (foundry.utils.getProperty(page, "flags.monks-enhanced-journal.type") == "list") {
			let entries = foundry.utils.getProperty(page, "flags.monks-enhanced-journal.entries");
			if (entries.length) {
				let idx = Math.floor(Math.random() * entries.length);
				text = entries[idx].text || entries[idx].title;
			}
		} else {
			let content = page.text.content;
			let $el = $(content);

			let tagName = $el.prop("tagName")?.toLowerCase();
			if (tagName == 'ul' || tagName == 'ol') {
				let items = $('li', $el);
				let idx = 0;
				if (tagName == 'ul') {
					idx = Math.floor(Math.random() * items.length);
				} else {
					idx = object.flags['monks-enhanced-journal']?.chatbubbleidx || 0;
					idx = (idx + 1) % items.length;
					idx = Math.clamp(idx, 0, items.length - 1);
					if (game.user.isGM)
						object.document.setFlag('monks-enhanced-journal', 'chatbubbleidx', idx);
					else
						MonksEnhancedJournal.emit("setChatBubbleIdx", { uuid: object.uuid, idx: idx });
				}
				text = items[idx].innerHTML;
			} else {
				text = content || "";
			}
		}

		if (!object.w)
			object.w = 0;

		if (text) {
			let broadcast = true;
			if (text?.trim().startsWith('<section class="secret">')) {
				broadcast = false;
				text = text.trim().replace('<section class="secret">', "");
				let idx = text.lastIndexOf('</section>');
				text = text.slice(0, idx) + text.slice(idx + 10, text.length);
			}
		
			canvas.hud.bubbles.say(object, text);
			if (broadcast) {
				MonksEnhancedJournal.emit('chatbubble', { entityId: object.id, text: text });
			}
		}
	}

	static chatbubble(data) {
		let object = canvas.tokens.get(data.entityId);
		if (!object) {
			object = canvas.notes.get(data.entityId);
			if (object) {
				//make sure we're either on the notes layer, or notes are visible
				if (!(game.settings.get("core", foundry.canvas.layers.NotesLayer.TOGGLE_SETTING) || ui.controls.control.name == 'notes'))
					object = null;
			}
		} else {
			//check on line of sight for the token?
		}
		if (object) {
			canvas.hud.bubbles.say(object, data.text);
		}
	}

	static async openObjectiveLink(ev) {
		let id = $(ev.currentTarget).closest('li')[0].dataset.documentId;
		let document = game.journal.get(id);
		if (! await MonksEnhancedJournal.openJournalEntry(document))
			return document.sheet.render(true);
	}

	static async openJournalEntryFromId(docId, options = {}) {
		let doc = await fromUuid(docId);
		if (doc) {
			MonksEnhancedJournal.openJournalEntry(doc, options);
		}
	}

	static async openJournalEntry(doc, options = {}) {
		if (!game.user.isGM && !setting('allow-player'))
			return false;

		if (game.modules.get('monks-common-display')?.active) {
			let data = game.settings.get("monks-common-display", 'playerdata');
			let playerdata = data[game.user.id] || { display: false, mirror: false, selection: false };

			if (playerdata.display)
				return false;
		}

		if (game.modules.get('conversation-hud')?.active && doc?.getFlag("conversation-hud", "type") == "conversation-sheet")
            return false;

		if (doc) {
			if (doc.content?.includes('QuickEncountersTutorial'))
				return false;

			MonksEnhancedJournal.fixType(doc);

			let sheet = (!doc?._sheet ? doc?._getSheetClass() : doc?._sheet);
			if ((sheet?.name || sheet?.constructor?.name) == 'QuestPreviewShim')
				return false;
			if ((sheet?.name || sheet?.constructor?.name) == 'NoteSheet')
				return false;
			if ((sheet?.name || sheet?.constructor?.name) == 'DscrybApp')
				return false;
			if ((sheet?.name || sheet?.constructor?.name) == 'NearbyApp')
				return false;
			if ((sheet?.name || sheet?.constructor?.name) == 'StorySheet')
				return false;
			if (doc.flags["pdfoundry"])
				return false;
		}

		if (options.render == false || options.activate == false)
			return false;

		if (doc?.pages?.size == 1) {
			let page = doc.pages.contents[0];
			if (MonksEnhancedJournal.getMEJType(page) == "picture" && !doc.testUserPermission(game.user, "OWNER")) {
				let defaultSettings = setting("sheet-settings");
				if (foundry.utils.getProperty(page, "flags.monks-enhanced-journal.sheet-settings.settings.open.value") === true || foundry.utils.getProperty(defaultSettings, "picture.settings.open.value") === true) {
					return false;
				}
			}
		}

		if (doc instanceof JournalEntry) {
			const allowed = Hooks.call(`openJournalEntry`, doc, options, game.user.id);
			if (allowed === false)
				return false;
		}
		if (doc instanceof JournalEntryPage) {
			const allowed = Hooks.call(`openJournalEntryPage`, doc, options, game.user.id);
			if (allowed === false)
				return false;
		}
		if (doc instanceof Actor && doc.type == "hazard") {
			return false;
		}

		if (!game.user.isGM && doc?.getUserLevel(game.user) === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
			if (doc.img) {
				let img = new foundry.applications.apps.ImagePopout({
					src: doc.img,
					window: {
						title: doc.name
					},
					uuid: doc.uuid,
					shareable: false,
					editable: false
				});
				img._render(true);
			} else
				ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: doc.documentName} ));
			return true;
		}

		//if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
		options = foundry.utils.mergeObject(options, { force: options?.tempOwnership, autoPage: true });
		if (MonksEnhancedJournal.journal) {
			if (doc)
				MonksEnhancedJournal.journal.open(doc, options.newtab, options);
			else {
				delete options.autoPage;
				MonksEnhancedJournal.journal.render(true, options);
			}
		}
		else {
			MonksEnhancedJournal.journal = await (new EnhancedJournal(options)).render(true, options);
			if (doc)
				MonksEnhancedJournal.journal.open(doc, options.newtab, options);
		}

		return true;
	}

	static selectGroups(choices, options) {
		const localize = options.hash['localize'] ?? false;
		let selected = options.hash['selected'] ?? null;
		let blank = options.hash['blank'] || null;
		selected = selected instanceof Array ? selected.map(String) : [String(selected)];

		// Create an option
		const option = (groupid, id, label) => {
			if (localize) label = game.i18n.localize(label);
			let key = (groupid ? groupid + ":" : "") + id;
			let isSelected = selected.includes(key);
			html += `<option value="${key}" ${isSelected ? "selected" : ""}>${label}</option>`
		};

		// Create the options
		let html = "";
		if (blank) option("", blank);
		if (choices instanceof Array) {
			for (let group of choices) {
				let label = (localize ? game.i18n.localize(group.text) : group.text);
				html += `<optgroup label="${label}">`;
				Object.entries(group.groups).forEach(e => option(group.id, ...e));
				html += `</optgroup>`;
			}
		} else {
			if (game.system.id == "burningwheel") {
				const a = RegExp.escape(Handlebars.escapeExpression(choices))
					, s = new RegExp(` value=["']${a}["']`);
				return options.fn(this).replace(s, "$& selected")
			} else
				Object.entries(choices).forEach(e => option(...e));
		}
		return new Handlebars.SafeString(html);
	}

	static _createPictureLink(match, { async = false, relativeTo } = {}) {
		let [type, target, name] = match.slice(1, 5);
		const data = {
			cls: ["picture-link"],
			icon: 'fas fa-image',
			dataset: {},
			name: name
		};

		let doc;
		let broken = false;

		data.dataset = { id: null, uuid: target };
		if (async) {
			doc = fromUuid(target, relativeTo);
		} else {
			try {
				doc = fromUuidSync(target, relativeTo);
			} catch (err) {
				[type, ...target] = target.split(".");
				broken = foundry.applications.ux.TextEditor.implementation._createLegacyContentLink(type, target.join("."), name, data);
			}
		}

		// Flag a link as broken
		if (broken) {
			data.icon = "fas fa-unlink";
			data.cls.push("broken");
		}

		const constructAnchor = doc => {
			if (doc) {
				if (doc.documentName) {
					const attrs = { draggable: true };
					if (hash) attrs["data-hash"] = hash;
					return doc.toAnchor({ attrs, classes: data.cls, name: data.name });
				}
				data.name = data.name || doc.name || target;
				const type = game.packs.get(doc.pack)?.documentName;
				data.dataset.type = type;
				data.dataset.id = doc._id;
				data.dataset.pack = doc.pack;
				if (hash) data.dataset.hash = hash;
			} else {
				data.icon = "fas fa-unlink";
				data.cls.push("broken");
			}

			const a = document.createElement("a");
			a.classList.add(...data.cls);
			a.draggable = true;
			for (let [k, v] of Object.entries(data.dataset)) {
				a.dataset[k] = v;
			}
			a.innerHTML = `<i class="${data.icon}"></i>${data.name}`;
			return a;
		};

		if (doc instanceof Promise) return doc.then(constructAnchor).catch(() => {
			return constructAnchor()
		});
		return constructAnchor(doc);
	}

	static async _onClickPictureLink(event) {
		event.preventDefault();
		const a = event.currentTarget;
		let document = null;
		let id = a.dataset.id;

		/*
		// Target 1 - Compendium Link
		if (a.dataset.pack) {
			const pack = game.packs.get(a.dataset.pack);
			if (a.dataset.lookup) {
				if (!pack.index.length) await pack.getIndex();
				const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
				if (entry) {
					a.dataset.id = id = entry._id;
					delete a.dataset.lookup;
				}
			}
			document = id ? await pack.getDocument(id) : null;
		}

		// Target 2 - World Entity Link
		else {*/
		document = game.journal.get(id);
		if (!document) return;
		if (!document.testUserPermission(game.user, "LIMITED")) {
			return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: document.documentName }));
		}
		//}
		if (!document) return;

		new foundry.applications.apps.ImagePopout({
			src: document.img,
			window: {
				title: document.name
			},
			uuid: document.uuid,
			shareable: false,
			editable: false
		})._render(true);

		//if (game.user.isGM)
		//    this._onShowPlayers({ data: { object: document } });
	}

	static async ready() {
		game.socket.on(MonksEnhancedJournal.SOCKET, MonksEnhancedJournal.onMessage);

		APSJ.init();

		MonksEnhancedJournal.TimeOffset = 0;
		if (game.system.id === 'pf2e') {
			let createTime = game.pf2e.worldClock.worldCreatedOn.c;
			MonksEnhancedJournal.TimeOffset = (createTime.hour * 3600) + (createTime.minute * 60) + createTime.second + (createTime.millisecond * 0.001);
		}

		if (game.system.id == 'pf2e') {
			MonksEnhancedJournal.pf2eCurrency = {};
			let pack = game.packs.get("pf2e.equipment-srd");
			const index = await pack.getIndex();
			for (let [key, coin] of Object.entries({ cp: "Copper Pieces", sp: "Silver Pieces", gp: "Gold Pieces", pp: "Platinum Pieces" })) {
				let item = index.find(i => i.name == coin);
				if (item) {
					const document = await pack.getDocument(item._id);
					MonksEnhancedJournal.pf2eCurrency[key] = document.toObject();
				}
			}
		} else if (game.system.id == 'wfrp4e') {
			MonksEnhancedJournal.wfrp4eCurrency = {};
			let pack = game.packs.get("wfrp4e.basic");
			const index = await pack.getIndex();
			for (let [key, coin] of Object.entries({ gc: "Gold Crown", ss: "Silver Shilling", bp: "Brass Penny" })) {
				let item = index.find(i => i.name == coin);
				if (item) {
					const document = await pack.getDocument(item._id);
					MonksEnhancedJournal.wfrp4eCurrency[key] = document.toObject();
				}
			}
		}

		if (game.system.id == "sfrpg") {
			let cls = CONFIG.Actor.sheetClasses.character["sfrpg.ActorSheetSFRPGCharacter"].cls;
			let oldProcessDroppedData = cls.prototype.processDroppedData;
			cls.prototype.processDroppedData = async function (event, parsedDragData) {
				if (parsedDragData.from && parsedDragData.data) {

					let entry = await fromUuid(parsedDragData.pageUuid);
					if (entry) {
						MonksEnhancedJournal.fixType(entry);
						const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
						if (cls && cls.itemDropped) {
							cls.itemDropped.call(cls, parsedDragData.id, this.actor, entry).then(async (result) => {
								if ((result?.quantity ?? 0) > 0) {
									setValue(parsedDragData.data, quantityname(), result.quantity);

									delete parsedDragData.data._id;
									const addedItemResult = await this.actor.createEmbeddedDocuments("Item", [parsedDragData.data], {});
									if (addedItemResult) {
										const addedItem = this.actor.items.get(addedItemResult.id);

										if (game.settings.get('sfrpg', 'scalingCantrips') && sidebarItem.type === "spell") {
											_onScalingCantripDrop(addedItem, this.actor);
										}
									}
								}
							});

							return false;
						}
					}
				} else
					return oldProcessDroppedData.call(this, event, parsedDragData);
			}
		}

		let sheetSettings = game.settings.settings.get("monks-enhanced-journal.sheet-settings");
		if (sheetSettings) {
			let original = Object.keys(game.system?.documentTypes?.Item || {});
			if (!(original instanceof Array)) {
				original = Object.keys(original);
			}
			let types = original.filter(x => MonksEnhancedJournal.includedTypes.includes(x));
			types = types.reduce((obj, t) => {
				const label = CONFIG.Item?.typeLabels?.[t] ?? t;
				obj[t] = {
					name: game.i18n.has(label) ? game.i18n.localize(label) : t
				}
				return obj;
			}, {});
			foundry.utils.mergeObject(sheetSettings.default.shop.adjustment, types);
		}

		let chatbubbles = game.settings.settings.get("monks-enhanced-journal.show-chat-bubbles");
		if (chatbubbles)
			chatbubbles.default = !game.user.isGM;

		$('body').attr("inline-roll-styling", setting("inline-roll-styling"));

		for (let entry of game.journal) {
			if (entry?.flags['monks-enhanced-journal']?.type) {
				MonksEnhancedJournal.fixType(entry);
			}
		}

		if (game.user.isGM) {
			MonksEnhancedJournal.fixItems();
			MonksEnhancedJournal.fixRelationships();
			if (setting("fix-journals")) {
				try {
					MonksEnhancedJournal.fixPages();
					game.settings.set("monks-enhanced-journal", "fix-journals", false);
				} catch { }
			}
			if (setting("fix-checklist")) {
				try {
					MonksEnhancedJournal.fixChecklist();
					game.settings.set("monks-enhanced-journal", "fix-checklist", false);
				} catch { }
			}
			if (setting("fix-person")) {
				try {
					MonksEnhancedJournal.fixPersonAttributes();
				   // game.settings.set("monks-enhanced-journal", "fix-person", false);
				} catch { }
			}
			if (setting("fix-adjustment")) {
				try {
					MonksEnhancedJournal.fixAdjustments();
					game.settings.set("monks-enhanced-journal", "fix-adjustment", false);
				} catch { }
			}
			if (setting("fix-sheet-settings")) {
				try {
					MonksEnhancedJournal.fixSheetSettings();
					game.settings.set("monks-enhanced-journal", "fix-sheet-settings", false);
				} catch { }
			}
			if (setting("fix-list-sheet")) {
				try {
					MonksEnhancedJournal.fixListType();
					game.settings.set("monks-enhanced-journal", "fix-list-sheet", false);
				} catch { }
			}
			if (setting("fix-v13")) {
				try {
					MonksEnhancedJournal.fixv13();
					game.settings.set("monks-enhanced-journal", "fix-v13", false);
				} catch { }
			}
		}

		MonksEnhancedJournal.cleanPageState();

		$('<div>').attr('id', 'slideshow-canvas').addClass('monks-journal-sheet flexrow').append($('<div>').addClass('slideshow-container flexcol playing').append($('<div>').addClass('slide-showing'))).append($('<div>').addClass('slide-padding')).appendTo($('body'));
		//new SlideshowViewer().render(true);
		new ResizeObserver(() => {
			//change font size to match height
			let size = $('#slideshow-canvas .slide-textarea').outerWidth() / 50;
			$('#slideshow-canvas .slide-textarea').css({ 'font-size': `${size}px` });
		}).observe($('#slideshow-canvas')[0]);
		
		// Preload fonts for polyglot so there isn't a delay in showing them, and possibly revealing something
		/*
		if (game.modules.get("polyglot")?.active && !foundry.utils.isNewerVersion(game.modules.get("polyglot")?.version, "1.7.30")) {
			let root = $('<div>').attr('id', 'enhanced-journal-fonts').appendTo('body');
			for (let [k, v] of Object.entries(polyglot.polyglot.LanguageProvider.alphabets)) {
				$('<span>').attr('lang', k).css({ font: v }).appendTo(root);
			}
		}
		*/

		let onChatDrop = async function (event) {
			let data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

			if (data.type == "JournalTab") {
				let page = await fromUuid(data.uuid);

				let chatData = {
					title: page.name,
					src: page.src,
					uuid: data.uuid
				};

				const ownership = page.parent.ownership;

				//create a chat message
				let whisper = null;
				if (ownership.default < CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
					whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
					for (let [userId, permission] of Object.entries(ownership)) {
						if (permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)
							whisper.push(userId);
					}
					whisper = whisper.filter((value, index, array) => array.indexOf(value) === index);
				}
				let content = await foundry.applications.handlebars.renderTemplate("modules/monks-enhanced-journal/templates/journal-chat.html", chatData);
				let messageData = {
					user: game.user.id,
					speaker: null,
					style: CONST.CHAT_MESSAGE_STYLES.OTHER,
					content: content,
					whisper: whisper,
					flags: { "journal-chat-card": true }
				};

				return ChatMessage.create(messageData, {});
			}
		}

		$("#chat-message").get(0)?.addEventListener("drop", onChatDrop.bind(this));
	}

	static getIcon(type) {
		switch (type) {
			case 'picture':
			case 'image': return 'fa-image';
			case 'person': return 'fa-user';
			case 'place': return 'fa-place-of-worship';
			case 'slideshow': return 'fa-photo-video';
			case 'encounter': return 'fa-toolbox';
			case 'event': return 'fa-calendar-days';
			case 'quest': return 'fa-map-signs';
			case 'journalentry': return 'fa-book-open';
			case 'actor': return 'fa-users';
			case 'organization': return 'fa-flag';
			case 'shop': return 'fa-dolly-flatbed';
			case 'loot': return 'fa-donate';
			case 'poi': return 'fa-map-marker-alt';
			case 'list': return 'fa-list';
			default:
				return 'fa-book-open';
		}
	}

	static onMessage(data) {
		//log('message', data);
		MonksEnhancedJournal[data.action].call(MonksEnhancedJournal, data);
	}

	static async saveUserData(data) {
		if (game.user.isGM) {
			let document = await fromUuid(data.documentId);
			if (document) {
				let update = {};
				update["flags.monks-enhanced-journal." + data.userId] = data.userdata;

				document.update(update);
			}
		}
	}

	static async showEntry(data) {
		if (data.users == undefined || data.users.includes(game.user.id)) {
			//show an entry
			if (data.image != undefined) {
				let img = new foundry.applications.apps.ImagePopout({
					src: data.image,
					window: {
						title: data.title
					},
					uuid: data.uuid,
					shareable: false,
					editable: false
				});
				await img._render(true);
				$(img.element).attr('data-show-id', data.showid);
			} else {
				Journal._showEntry(data.uuid, null, true);
			}
		}
	}

	static async setChatBubbleIdx(data) {
		let object = await fromUuid(data.uuid);
		if(object)
			object.setFlag('monks-enhanced-journal', 'chatbubbleidx', data.idx);
	}

	static cancelShow(data) {
		let app = $('.image-popout[data-show-id="' + data.showid + '"]');
		if (app.length > 0) {
			$('.window-header .close', app).click();
		} else {
			//check to see if this is a tab
		}
	}

	static async addRelationship(data) {
		if (game.user.isGM) {
			let original = await fromUuid(data.uuid);
			let orgPage = original.pages.contents[0];
			if (original.isOwner && orgPage.isOwner) {
				MonksEnhancedJournal.fixType(orgPage);
				let sheet = orgPage.sheet;
				sheet.addRelationship({ id: data.relationship.id, uuid: data.relationship.uuid, hidden: data.hidden }, false);
			}
		}
	}

	static async deleteRelationship(data) {
		if (game.user.isGM) {
			let original = await fromUuid(data.uuid);
			let orgPage = original.pages.contents[0];
			if (original.isOwner && orgPage.isOwner) {
				orgPage.unsetFlag('monks-enhanced-journal', `relationships.${data.id}`);
			}
		}
	}

	/*
	static startSlideshow(id) {
		let journal = game.journal.get(id);
		if (journal && journal.pages.size == 1 && foundry.utils.getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") == "slideshow") {
			let page = journal.pages.contents[0];
			page.type = "slideshow";
			return page.sheet.render(true, { play: true });
		}
	}

	static endSlideshow(id) {
		let journal = game.journal.get(id);
		if (journal && journal.pages.size == 1 && foundry.utils.getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") == "slideshow") {
			let page = journal.pages.contents[0];
			let sheet = page.sheet;
			sheet.stopSlideshow();
		}
	}
	*/

	static async stopSlideshowAudio(data) {
		if (MonksEnhancedJournal.slideshow?.sound?.src != undefined) {
			MonksEnhancedJournal.slideshow.sound.stop();
			MonksEnhancedJournal.slideshow.sound = undefined;
		}
	}

	static async stopSlideAudio(data) {
		if (MonksEnhancedJournal.slideshow?.slidesound?.src != undefined) {
			MonksEnhancedJournal.slideshow.slidesound.stop();
			MonksEnhancedJournal.slideshow.slidesound = undefined;
		}
	}

	static async playSlideshow(data) {
		if (!game.user.isGM) {
			//clear any old ones
			if (MonksEnhancedJournal.slideshow != undefined && MonksEnhancedJournal.slideshow.id != data.id)
				MonksEnhancedJournal.stopSlideshow();

			let slideshow = await fromUuid(data.uuid);
			if (slideshow) {
				MonksEnhancedJournal.slideshow = {
					id: data.id,
					object: slideshow,
					content: slideshow.flags["monks-enhanced-journal"]
				}

				let showas = MonksEnhancedJournal.slideshow.content.showas;
				if (showas == 'window') {
					//if for some reason the slideshow window isn't there, recreate it
					if ($('#slideshow-viewer').length == 0) {
						let display = new SlideshowViewer({ document: slideshow });
						await display.render(true);
						new ResizeObserver(() => {
							//change font size to match height
							let size = $('#slideshow-viewer .slide-textarea').outerWidth() / 50;
							$('#slideshow-viewer .slide-textarea').css({ 'font-size': `${size}px` });
						}).observe($('#slideshow-viewer')[0]);
					}
					$('#slideshow-viewer header h1.window-title').html(MonksEnhancedJournal.slideshow.object.name)
					MonksEnhancedJournal.slideshow.element = $('#slideshow-viewer');
				} else {
					MonksEnhancedJournal.slideshow.element = $('#slideshow-canvas');
					let canvascolor = slideshow.flags["monks-enhanced-journal"].canvascolor || "";
					$(MonksEnhancedJournal.slideshow.element).css({ 'background-color': canvascolor});
					$('.slide-padding', MonksEnhancedJournal.slideshow.element).css({ flex: '0 0 ' + $('#sidebar').width() + 'px' });
					MonksEnhancedJournal.slideshow.element.toggleClass('fullscreen', showas == 'fullscreen');
				}
				$('.slide-showing', MonksEnhancedJournal.slideshow.element).empty();
				MonksEnhancedJournal.slideshow.element.addClass('active');

				if (MonksEnhancedJournal.slideshow.content.audiofile != undefined && MonksEnhancedJournal.slideshow.content.audiofile != '' && MonksEnhancedJournal.slideshow.sound == undefined) {
					let volume = MonksEnhancedJournal.slideshow.content.volume ?? 1;
					foundry.audio.AudioHelper.play({
						src: MonksEnhancedJournal.slideshow.content.audiofile,
						loop: MonksEnhancedJournal.slideshow.content.loopaudio,
						volume: volume //game.settings.get("core", "globalInterfaceVolume")
					}).then((sound) => {
						if (MonksEnhancedJournal.slideshow)
							MonksEnhancedJournal.slideshow.sound = sound;
						MonksEnhancedJournal.sounds.push(sound);
						sound.effectiveVolume = volume;
						return sound;
					});
				}

				MonksEnhancedJournal.slideshow.playing = true;
				MonksEnhancedJournal.slideshow.slideAt = -1;

				if (data.idx != undefined)
					MonksEnhancedJournal.playSlide(data);
			}
		}
	}

	static playSlide(data) {
		//start up a new slideshow if there isn't one
		if (MonksEnhancedJournal.slideshow == undefined) {
			MonksEnhancedJournal.playSlideshow(data);
		}

		if (MonksEnhancedJournal.slideshow != undefined) {
			if (MonksEnhancedJournal.slideshow.element == undefined) {
				MonksEnhancedJournal.slideshow.callback = data;
			} else {
				if (MonksEnhancedJournal.slideshow.slideAt == data.idx)
					return;

				let slides = MonksEnhancedJournal.slideshow.content.slides;
				let idx = Math.clamp(data.idx, 0, slides.length - 1);
				MonksEnhancedJournal.slideshow.slideAt = idx;
				let slide = MonksEnhancedJournal.slideshow.slide = MonksEnhancedJournal.slideshow.content.slides[idx];

				//remove any that are still on the way out
				$('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).remove();

				//remove any old slides
				$('.slide-showing .slide', MonksEnhancedJournal.slideshow.element).addClass('out');

				//bring in the new slide
				let effect = (slide.transition?.effect == 'fade' ? null : slide.transition?.effect) || MonksEnhancedJournal.slideshow?.content?.transition?.effect || 'none';

				let newSlide = MonksEnhancedJournal.createSlide(slide, MonksEnhancedJournal.slideshow.content);
				$('.slide-showing', MonksEnhancedJournal.slideshow.element).append(newSlide);
				if (newSlide) {
					var img = $('.slide-image', newSlide);

					function loaded() {
						let size = $('.slide-showing', MonksEnhancedJournal.slideshow.element).outerWidth() / 50;
						$('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });

						newSlide.removeClass('loading');
						if (effect != 'none' && $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).length) {
							let realeffect = effect;
							if (effect == 'slide-bump-left') {
								realeffect = 'slide-slide-left';
								$('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-slide-out-right');
							} else if (effect == 'slide-bump-right') {
								realeffect = 'slide-slide-right';
								$('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-slide-out-left');
							} else if (effect == 'slide-flip') {
								realeffect = 'slide-flip-in';
								$('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-flip-out');
							} else if (effect == 'slide-page-turn') {
								realeffect = '';
								$('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-page-out');
								newSlide.css({ opacity: 1 });
							}
							newSlide.addClass(realeffect).on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function (evt) {
								if ($(evt.target).hasClass('slide')) {
									$('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).remove();
									newSlide.removeClass(realeffect);

									if (MonksEnhancedJournal.slideshow.slidesound?.src != undefined) {
										MonksEnhancedJournal.slideshow.slidesound.stop();
										MonksEnhancedJournal.slideshow.slidesound = undefined;
									}
									if (MonksEnhancedJournal.slideshow.slide.audiofile != undefined && MonksEnhancedJournal.slideshow.slide.audiofile != '') {
										let volume = MonksEnhancedJournal.slideshow.slide.volume ?? 1;
										foundry.audio.AudioHelper.play({
											src: MonksEnhancedJournal.slideshow.slide.audiofile,
											loop: false,
											volume: volume //game.settings.get("core", "globalInterfaceVolume")
										}).then((sound) => {
											MonksEnhancedJournal.slideshow.slidesound = sound;
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
							if (MonksEnhancedJournal.slideshow.slidesound?.src != undefined) {
								MonksEnhancedJournal.slideshow.slidesound.stop();
								MonksEnhancedJournal.slideshow.slidesound = undefined;
							}
							if (MonksEnhancedJournal.slideshow.slide.audiofile != undefined && MonksEnhancedJournal.slideshow.slide.audiofile != '') {
								let volume = MonksEnhancedJournal.slideshow.slide.volume ?? 1;
								foundry.audio.AudioHelper.play({
									src: MonksEnhancedJournal.slideshow.slide.audiofile,
									loop: false,
									volume: volume //game.settings.get("core", "globalInterfaceVolume")
								}).then((sound) => {
									MonksEnhancedJournal.slideshow.slidesound = sound;
									MonksEnhancedJournal.sounds.push(sound);
									sound.effectiveVolume = volume;
									return sound;
								});
							}
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
							}
							else if ($.isNumeric(text.fadeout)) {
								let fadeout = ($.isNumeric(text.fadein) ? text.fadein : 0) + (effect != 'none' ? 1 : 0) + text.fadeout;
								$('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).css({ 'animation-delay': fadeout + 's' }).addClass('text-fade-out');
							}
						}
					}

					if (img[0].complete) {
						loaded.call(this);
					} else {
						img.on('load', loaded.bind(this));
						img.on('loadeddata', loaded.bind(this));
						img.on('error', function () {
							loaded.call(this);
						})
					}
				}
			}
		}
	}

	static stopSlideshow(data) {
		if (!game.user.isGM) {
			if (MonksEnhancedJournal.slideshow != undefined) {
				MonksEnhancedJournal.slideshow?.element?.removeClass('active');
				if ($(MonksEnhancedJournal.slideshow?.element).attr('id') == "slideshow-viewer")
					$('.close', MonksEnhancedJournal.slideshow?.element).click();

				if (MonksEnhancedJournal.slideshow?.sound?.src != undefined) {
					MonksEnhancedJournal.slideshow?.sound.stop();
				}
				if (MonksEnhancedJournal.slideshow?.slidesound?.src != undefined) {
					MonksEnhancedJournal.slideshow?.slidesound.stop();
				}
				delete MonksEnhancedJournal.slideshow;
			}
		}
	}

	static createSlide(slide, slideshow) {
		if (slide == undefined)
			return false;

		let background = '';
		if (slide.background?.color == '')
			background = `background-image:url(\'${slide.img}\');`;
		else
			background = `background-color:${slide.background?.color}`;

		let windowSize = 25;
		let windowFont = $(".window-content").css("font-family");

		let journalFont = foundry.utils.getProperty(slideshow, "font") || {};
		let slideFont = foundry.utils.getProperty(slide, "font") || {};

		let textarea = $('<div>').addClass('slide-textarea');
		for (let t of slide.texts) {
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
				top: (t.top || 0) + "%",
				left: (t.left || 0) + "%",
				right: (t.right || 0) + "%",
				bottom: (t.bottom || 0) + "%",
			};
			if ($.isNumeric(t.fadein))
				style.opacity = 0;

			textarea.append($('<div>').addClass('slide-text').attr({'data-id': t.id}).html(t.text).css(style));
		}

		let tag = foundry.helpers.media.VideoHelper.hasVideoExtension(slide.img) ? "<video>" : "<img>";

		return $('<div>').addClass("slide animate-slide loading").attr('data-slide-id', slide.id)
			.append($('<div>').addClass('slide-background').append($('<div>').attr('style', background)))
			.append($(tag).addClass('slide-image').attr({ 'src': slide.img, 'loop': true, 'autoplay': "true" }).css({ 'object-fit': slide.sizing}))
			.append(textarea);
	}

	static refreshObjectives(resize = false) {
		let showObjectives = ((ui.controls.control.name == 'notes' || setting('objectives-always')) && setting('show-objectives') && setting('show-dialog'));
		if (showObjectives) {
			if (!MonksEnhancedJournal.objdisp)
				MonksEnhancedJournal.objdisp = new ObjectiveDisplay();
			MonksEnhancedJournal.objdisp.render(true);
			if (resize)
				MonksEnhancedJournal.objdisp.setPosition();
		} else if (MonksEnhancedJournal.objdisp)
			MonksEnhancedJournal.objdisp.close({ properClose: true });


		/*
		let display = $('#objective-display').empty();

		if (setting('show-dialog')) {
			let quests = $('<ul>');
			//find all in progress quests
			for (let quest of game.journal) {
				if (quest.getFlag('monks-enhanced-journal', 'type') == 'quest' && quest.testUserPermission(game.user, "OBSERVER") && quest.getFlag('monks-enhanced-journal', 'display') && quest.getFlag('monks-enhanced-journal', 'display')) {
					//find all objectives
					let objectives = $('<ul>');
					$('<li>')
						.attr('data-document-id', quest.id)
						.append(quest.getFlag('monks-enhanced-journal', 'completed') ? '<i class="fas fa-check"></i> ' : '')
						.append(`<b>${quest.name}</b>`)
						.append(objectives)
						.on('click', MonksEnhancedJournal.openObjectiveLink.bind(this))
						.appendTo(quests);

					if (setting('use-objectives')) {
						for (let objective of (quest.getFlag('monks-enhanced-journal', 'objectives') || [])) {
							if (objective.available) {
								let li = $('<li>').addClass('flexrow').append($('<span>').html(objective.title || objective.content)).attr('completed', objective.status);
								if ($.isNumeric(objective.required))
									li.append($('<span>').html(`${objective.done || 0}/${objective.required}`).css({ 'flex': '0 0 50px', 'text-align': 'right' }));
								objectives.append(li);
							}
						}
					}
				}
			}

			if (quests.children().length > 0) {
				display.append($('<div>').addClass('title').html('Quests')).append(quests);
			}
		}*/
	}

	static updateDirectory(html, main) {
		if (setting("show-folder-sort")) {
			$('.folder', html).each(function () {
				let id = this.dataset.folderId;
				const folder = game.folders.get(id);

				if (folder?.sorting !== "a") {
					$('header h3 i', this).removeClass('fas').addClass('far');
				}
			});
		}
		const levels = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
		const types = MonksEnhancedJournal.getDocumentTypes();
		$('.document.journalentry', html).each(function () {
			let id = this.dataset.entryId;
			let document = game.journal.get(id);

			let canShow = (game.user.isGM || setting('allow-player'));

			let docIcon = "fa-book";
			let type = "journalbook";
			if (document.pages.size == 1) {
				type = document.pages.contents[0].getFlag('monks-enhanced-journal', 'type');
				if (type == "base" || type == "oldentry") type = "journalentry";
				if (types[type])
					docIcon = MonksEnhancedJournal.getIcon(type);
				else if (game.modules.get("conversation-hud")?.active) {
					type = document.pages.contents[0].getFlag('conversation-hud', 'type');
					if (type == "conversation-sheet-data") {
                        docIcon = "fa-comments";
					}
				}
			}

			if ($('.entry-name .journal-type', this).length)
				$('.entry-name .journal-type', this).attr('class', 'journal-type fas fa-fw ' + docIcon);
			else {
				let icon = $('<i>').addClass('fas fa-fw ' + docIcon);
				/*
				if (type == "journalfolder" && document.pages.contents.length > 1 && canShow) {
					icon.on("click", (event) => {
						event.preventDefault();
						event.stopPropagation();
						let collapsed = !document.getFlag('monks-enhanced-journal', 'collapsed');
						game.folders._expanded[document.id] = !collapsed;
						document.setFlag('monks-enhanced-journal', 'collapsed', collapsed);
						$(`.document.journalentry.folder[data-document-id="${document.id}"]`).toggleClass("collapsed", collapsed);
						$(`.document.journalentry.folder[data-document-id="${document.id}"] .entry-name i`).toggleClass('fa-angle-down', !collapsed).toggleClass('fa-angle-right', collapsed);
					});
				} else
				*/
					icon.addClass("journal-type");
				$('.entry-name', this).prepend(icon);
			}

			/*
			if (type == "journalfolder" && !$('.subdirectory', this).length && document.pages.contents.length > 1 && canShow) {
				$(this).addClass("folder flexcol").removeClass("flexrow").attr('data-folder-id', document.id);
				if (!document.getFlag('monks-enhanced-journal', 'collapsed'))
					game.folders._expanded[document.id] = true;
				else
					$(this).addClass("collapsed");
				let pageList = $('<ol>').addClass("subdirectory").insertAfter($('.entry-name', this));
				for (let page of document.pages.contents) {
					let pageType = page.getFlag('monks-enhanced-journal', 'type');
					let pageIcon = MonksEnhancedJournal.getIcon(pageType);
					let liPage = $('<li>')
						.addClass("directory-item document journalentrypage flexrow")
						.attr({ "data-page-id": page.id, "data-document-id": id, "draggable": true })
						.append(
							$("<h4>")
								.addClass("entry-name")
								.append($("<i>").addClass(`journal-type fas fa-fw ${pageIcon}`))
								.append($("<a>").html(page.name))
						)
						.on("click", (event) => {
							event.preventDefault();
							event.stopPropagation();
							if (! await MonksEnhancedJournal.openJournalEntry(page, { newtab: setting('open-new-tab') })) {
								let sheet = page._getSheetClass();
								new sheet(page).render(true);
							}
						}).appendTo(pageList);

					if (pageType == 'quest') {
						//let ownership = entry.ownership.default;
						//let completed = entry.getFlag('monks-enhanced-journal', 'completed');
						let status = page.getFlag('monks-enhanced-journal', 'status') || (page.getFlag('monks-enhanced-journal', 'completed') ? 'completed' : 'inactive');
						$(liPage).attr('status', status);
					}
				}
				ui.journal._dragDrop.forEach(d => d.bind(pageList[0]));
			}*/

			if (type == 'quest') {
				//let ownership = entry.ownership.default;
				//let completed = entry.getFlag('monks-enhanced-journal', 'completed');
				let page = document.pages.contents[0];
				let status = foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.status') || (foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.completed') ? 'completed' : 'inactive');
				$(this).attr('status', status);
			}

			$('.entry-name .permissions', this).remove();
			if ((setting('show-permissions') == 'true' || (setting('show-permissions') == 'mej' && !main)) && game.user.isGM && (document.ownership.default > 0 || Object.keys(document.ownership).length > 1)) {
				let permissions = $('<div>').addClass('permissions');

				if (document.ownership.default > 0) {
					const [ownership] = levels.find(([, level]) => level === document.ownership.default);
					permissions.append($('<i>').addClass('fas fa-users').attr('title', `${i18n("MonksEnhancedJournal.Everyone")}: ${i18n(`OWNERSHIP.${ownership}`)}`));
				}
				for (let [key, value] of Object.entries(document.ownership)) {
					let user = game.users.find(u => {
						return u.id == key && !u.isGM;
					});
					if (user != undefined && value > 0 && value != document.ownership.default) {
						const [ownership] = levels.find(([, level]) => level === value);
						permissions.append($('<div>').css({ backgroundColor: user.color }).html(user.name[0]).attr('title', user.name + ': ' + i18n(`OWNERSHIP.${ownership}`)));
					}
				}
				$(this).append(permissions);
			}
		});
	}

	static refreshDirectory(data) {
		ui[data.name]?.render();
	}

	static getWorldTime() {
		let currentWorldTime = game.time.worldTime + MonksEnhancedJournal.TimeOffset;
		let dayTime = Math.abs(Math.trunc((currentWorldTime % 86400) / 60));
		if (currentWorldTime < 0) dayTime = 1440 - dayTime;

		return dayTime;
	}

	static async addLog(data) {
		if (game.user.isTheGM) {
			let entry = await fromUuid(data.entityId);
			MonksEnhancedJournal.fixType(entry);
			const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
			cls.addLog.call(entry, data);
		}
	}

	static getOpenState(data) {
		let state = foundry.utils.getProperty(data, "flags.monks-enhanced-journal.state");

		let autoopen = foundry.utils.getProperty(data, "flags.monks-enhanced-journal.autoopen");
		let opening = foundry.utils.getProperty(data, "flags.monks-enhanced-journal.opening");
		let closing = foundry.utils.getProperty(data, "flags.monks-enhanced-journal.closing");
		if (autoopen && opening && closing) {
			let dayTime = MonksEnhancedJournal.getWorldTime();
			// Check to see that a time keeping program is active and determine if the store is open from time.
			let isopen = opening > closing ? (dayTime >= opening && dayTime <= 1440) || (dayTime >= 0 && dayTime <= closing) : dayTime >= opening && dayTime <= closing;
			return isopen ? "open" : "closed";
		} else
			return state;
	}

	static async purchaseItem(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.shopid);
			let actor = game.actors.get(data.actorid);

			if (entry) {
				MonksEnhancedJournal.fixType(entry);
				const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
				if (cls && cls.purchaseItem) {
					cls.purchaseItem.call(cls, entry, data.itemid, data.quantity, { actor, user: data.user, chatmessage: data.chatmessage, purchased: data.purchased, remaining: data.remaining });
					let item = (entry.getFlag('monks-enhanced-journal', 'items') || {})[data.itemid];
					let price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.cost"));
					if (data.purchase === true && item) {
						price.value = price.value * (data.quantity ?? 1);
						cls.actorPurchase(actor, price);
					}
					cls.addLog.call(entry, { actor: actor.name, item: item.name, quantity: data.quantity, price: `${price.value} ${price.currency}`, type: data.purchase ? 'purchase' : 'but back' });
				}
			}
		}
	}

	static async requestLoot(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.shopid);
			let actor = game.actors.get(data.actorid);

			if (entry && actor) {
				let items = foundry.utils.duplicate(entry.getFlag('monks-enhanced-journal', 'items') || {});
				let item = items[data.itemid];
				if (item) {
					let requests = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.requests") || {};
					requests[data.senderId] = !requests[data.senderId];
					foundry.utils.setProperty(item, "flags.monks-enhanced-journal.requests", requests);
				}
				entry.setFlag('monks-enhanced-journal', 'items', items);
			}
		}
	}

	static async addItem(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.lootid);
			if (entry) {
				MonksEnhancedJournal.fixType(entry);
				const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
				const sheet = new cls(entry, { render: false });

				sheet.addItem({ data: data.itemdata });
			}
		}
	}

	static async sellItem(data) {
		if (game.user.isTheGM) {
			let entry = await fromUuid(data.shopid);
			if (entry) {
				MonksEnhancedJournal.fixType(entry);
				const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
				const sheet = new cls({ document: entry }, { render: false });

				sheet.addItem({ data: data.itemdata });

				let actor = await fromUuid(data.actorId);
				cls.addLog.call(entry, { actor: actor.name, item: data.itemdata.name, quantity: data.quantity, price: data.price, type: 'sell' });
			}
		}
	}

	static findVacantSpot(template, size, newTokens, center) {
		let tokenList = canvas.scene.tokens.contents.concat(...newTokens);

		let width = size.width * canvas.scene.dimensions.size;
		let height = size.height * canvas.scene.dimensions.size;
		let hw = width / 2;
		let hh = height / 2;

		let tokenCollide = function (pt) {
			let rect1 = { x1: pt.x - (width / 2) + 10, y1: pt.y - (height / 2) + 10, x2: pt.x + (width / 2) - 10, y2: pt.y + (height / 2) - 10 };
			let found = tokenList.find(tkn => {
				let rect2 = { x1: tkn.x + 10, y1: tkn.y + 10, x2: tkn.x + (tkn.width * canvas.scene.dimensions.size) - 10, y2: tkn.y + (tkn.height * canvas.scene.dimensions.size) - 10 };

				return !(rect1.x2 < rect2.x1 || rect1.x1 > rect2.x2 || rect1.y1 > rect2.y2 || rect1.y2 < rect2.y1);
			})

			return found != undefined;
		}

		let wallCollide = function (ray) {
			for (let wall of canvas.scene.walls) {
				if (foundry.utils.lineSegmentIntersects(ray.A, ray.B, { x: wall.c[0], y: wall.c[1] }, { x: wall.c[2], y: wall.c[3] }))
					return true;
			}
			return false
		}

		// get the template grid positions
		let positions = template._getGridHighlightPositions();
		if (canvas.grid.type == CONST.GRID_TYPES.GRIDLESS) {
			positions = positions.map((p) => {
				let dx = p.x - template.x;
				let dy = p.y - template.y;
				p.x = template.x + (dx * canvas.scene.dimensions.size);
				p.y = template.y + (dy * canvas.scene.dimensions.size);
				return p;
			}).filter((p) => {
				return canvas.grid._testShape(p.x - template.x, p.y - template.y, template.shape)
			});
		}
		/*
		let gr = new PIXI.Graphics();
		if (MonksEnhancedJournal.debugGr)
			canvas.tokens.removeChild(MonksEnhancedJournal.debugGr);
		MonksEnhancedJournal.debugGr = gr;
		canvas.tokens.addChild(gr);

		gr.beginFill(0x0000ff).drawCircle(template.x, template.y, 4).endFill();
		*/

		let noWall = positions.filter(p => {
			let { x, y } = p;
			// remove all the ones behind a wall
			let checkspot = {
				x: x + hw,
				y: y + hh
			};

			//is this on the other side of a wall?
			let ray = new foundry.canvas.geometry.Ray({ x: template.x, y: template.y }, { x: checkspot.x, y: checkspot.y });
			return !wallCollide(ray);
		});

		/*
		for (let p of noWall) {
			gr.beginFill(0x00ff00).drawCircle(p.x, p.y, 4).endFill();
		}
		*/

		if (noWall.length == 0)
			return { x: template.x - hw, y: template.y - hh };
		
		// find one without a token
		let noTokens = noWall.filter(p => {
			return !tokenCollide(p);
		});

		let array = (noTokens.length == 0 ? noWall : noTokens);
		if (center) {
			array = array.sort((a, b) => {
				return Math.hypot((template.x - a.x), (template.y - a.y)) - Math.hypot((template.x - b.x), (template.y - b.y))
			});
			return { x: array[0].x - (width / 2), y: array[0].y - (height / 2) };
		} else {
			// if there aren't any, then just pick a random spot
			let position = array[parseInt(Math.random() * array.length)];
			return { x: position.x, y: position.y };
		}
	}

	static _getGridHighlightPositions(template) {
		const grid = canvas.grid;
		const d = canvas.dimensions;
		const { x, y, distance } = template;

		// Get number of rows and columns
		const [maxRow, maxCol] = grid.getGridPositionFromPixels(d.width, d.height);
		let nRows = Math.ceil(((distance * 1.5) / d.distance) / (d.size / grid.h));
		let nCols = Math.ceil(((distance * 1.5) / d.distance) / (d.size / grid.w));
		[nRows, nCols] = [Math.min(nRows, maxRow), Math.min(nCols, maxCol)];

		// Get the offset of the template origin relative to the top-left grid space
		const [tx, ty] = grid.getTopLeft(x, y);
		const [row0, col0] = grid.getGridPositionFromPixels(tx, ty);
		const [hx, hy] = [Math.ceil(grid.w / 2), Math.ceil(grid.h / 2)];
		const isCenter = (x - tx === hx) && (y - ty === hy);

		// Identify grid coordinates covered by the template Graphics
		const positions = [];
		for (let r = -nRows; r < nRows; r++) {
			for (let c = -nCols; c < nCols; c++) {
				const [gx, gy] = grid.getPixelsFromGridPosition(row0 + r, col0 + c);
				const [testX, testY] = [(gx + hx) - x, (gy + hy) - y];
				const contains = ((r === 0) && (c === 0) && isCenter) || grid._testShape(testX, testY, this.shape);
				if (!contains) continue;
				positions.push({ x: gx, y: gy });
			}
		}
		return positions;
	}

	static notify(data) {
		if (game.user.isGM) {
			ui.notifications.info(format("MonksEnhancedJournal.msg.ActorRequestedItem", { actor: data.actor, item: data.item}));
		}
	}

	static async vote(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.listId);
			if (entry) {
				let items = foundry.utils.duplicate(foundry.utils.getProperty(entry, "flags.monks-enhanced-journal.items"));
				let item = items.find(i => i.id == data.itemId);

				if (item) {
					let players = item.players || {};
					players[data.userId] = !data.against;
					item.players = players;

					if (!!item.folder && setting("poll-folders-single-vote")) {
						let groupItems = items.filter(i => i.folder == item.folder && i.id != item.id);
						for (let gi of groupItems) {
							if (gi.players && gi.players[data.userId] != undefined) {
								delete gi.players[data.userId];
							}
						}
					}

					await entry.update({ "flags.monks-enhanced-journal.items": items });
				}
			}
		}
	}

	static async clearVote(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.listId);
			if (entry) {
				let items = foundry.utils.duplicate(foundry.utils.getProperty(entry, "flags.monks-enhanced-journal.items"));
				let item = items.find(i => i.id == data.itemId);

				if (item) {
					let players = item.players || {};
					delete players[data.userId];
					item.players = players;

					await entry.update({ "flags.monks-enhanced-journal.items": items });
				}
			}
		}
	}

	static async acceptItem(status) {
		let message = this;

		let content = $(message.content);
  
		let offered = message.getFlag('monks-enhanced-journal', 'offered');
		let approved = message.getFlag('monks-enhanced-journal', 'approved');
		let accepted = message.getFlag('monks-enhanced-journal', 'accepted');

		if (status == 'accept') {
			//find the shop        
			let msgshop = message.getFlag('monks-enhanced-journal', 'shop');
			let entry = await fromUuid(msgshop.uuid);
			if (!entry)
				return;
			//find the actor
			let msgactor = message.getFlag('monks-enhanced-journal', 'actor');
			let actor = game.actors.get(msgactor.id);
			if (!actor)
				return;

			let action = message.getFlag('monks-enhanced-journal', 'action');
			if (action == "buy") {
				accepted = true;
				let msg = `<span class="request-msg"><i class="fas fa-check"></i> ${i18n("MonksEnhancedJournal.msg.ItemAddedToInventory")}</span>`;
				//find the item
				let msgitems = message.getFlag('monks-enhanced-journal', 'items');
				for (let msgitem of msgitems) {
					let data = foundry.utils.getProperty(msgitem, "flags.monks-enhanced-journal");
                    data.consumable = data.consumable || false;
					let purchaseQty = data.quantity;
					if (purchaseQty == 0)
						continue;
					let item = (entry.getFlag('monks-enhanced-journal', 'items') || {})[msgitem._id];
					if (!item) {
						ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
						msg = `<span class="request-msg"><i class="fas fa-times"></i> ${i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity")}</span>`
						continue;
					}

					MonksEnhancedJournal.fixType(entry);
					const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

					let remaining = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity");
					if (remaining && remaining < purchaseQty) {
						//check to see if there's enough quantity
						ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
						msg = `<span class="request-msg"><i class="fas fa-times"></i> ${i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity")}</span>`
						continue;
					}

					if (data.sell > 0 && cls.canAfford) {
						//check if the player can afford it
						if (!cls.canAfford((data.sell * purchaseQty) + " " + data.currency, actor)) {
							ui.notifications.warn(format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name }));
							msg = `<span class="request-msg"><i class="fas fa-times"></i> ${format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name })}</span>`;
							continue;
						}
					}

					//Add it to the actor
					let itemData = foundry.utils.duplicate(item);
					if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
						itemData = await cls.createScrollFromSpell(itemData);
					}
					let itemQty = getValue(itemData, quantityname(), 1);
					setValue(itemData, quantityname(), purchaseQty * itemQty);
					if (data.sell > 0 && !setting("use-generic-price"))
						setPrice(itemData, pricename(), { value: data.sell, currency: data.currency });
					delete itemData._id;
					if (!data.consumable) {
						let sheet = actor.sheet;
						if (sheet._onDropItem)
							sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, itemData);
						else
							actor.createEmbeddedDocuments("Item", [itemData]);
					}
					//deduct the gold
					if (data.sell > 0)
						cls.actorPurchase(actor, { value: (data.sell * purchaseQty), currency: data.currency });
					cls.purchaseItem.call(cls, entry, item._id, data.quantity, { actor, chatmessage: false });

					cls.addLog.call(entry, { actor: actor.name, item: item.name, quantity: data.quantity, price: data.sell + " " + data.currency, type: 'purchase' });
				}

				$('.request-buttons', content).remove();
				$('input', content).remove();
				$('.item-quantity span, .item-price span', content).removeClass('player-only').show();
				$('.card-footer', content).html(msg);
			} else if (action == "sell") {
				if (game.user.isGM) {
					offered = !offered;
					approved = false;   //technically this shouldn't happen, but any time the GM changes, the player response should be cancelled
				}
				else
					approved = !approved;

				$('.card-footer', content).html(`<span class="request-msg">${offered ? i18n("MonksEnhancedJournal.msg.ShopMadeOffer") : i18n("MonksEnhancedJournal.msg.ShopConsideringOffer")}</span>`);

				if (offered && approved) {
					accepted = true;
					MonksEnhancedJournal.fixType(entry);
					const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

					let msgitems = message.getFlag('monks-enhanced-journal', 'items');
					for (let msgitem of msgitems) {
						let data = foundry.utils.getProperty(msgitem, "flags.monks-enhanced-journal")
						let purchaseQty = data.quantity;

						if (purchaseQty == 0)
							continue;

						let actoritem = actor.items.get(msgitem._id);
						if (!actoritem)
							continue;

						data.maxquantity = getValue(actoritem, quantityname());
						if (data.maxquantity < purchaseQty) {
							purchaseQty = Math.min(data.maxquantity, purchaseQty);
							ui.notifications.warn(format("MonksEnhancedJournal.msg.NoteEnoughRemains", { quantity: purchaseQty }));
						}

						//give the player the money
						await cls.actorPurchase(actor, { value: -(data.sell * purchaseQty), currency: data.currency });

						//remove the item from the actor
						if (purchaseQty == data.maxquantity) {
							await actoritem.delete();
						} else {
							let qty = data.maxquantity - purchaseQty;
							let update = { system: {} };
							update.system[quantityname()] = actoritem.system[quantityname()];
							setValue(update, quantityname(), qty);
							await actoritem.update(update);
						}

						//add the item to the shop
						let sell = entry.getFlag('monks-enhanced-journal', 'sell') ?? 2
						data.quantity = purchaseQty;
						data.price = (data.sell * sell) + " " + data.currency;
						data.lock = true;
						data.from = actor.name;

						foundry.utils.setProperty(msgitem, "flags.monks-enhanced-journal", data);

						if (!game.user.isGM)
							MonksEnhancedJournal.emit("sellItem", { shopid: msgshop.uuid, itemdata: msgitem, actorId: actor.uuid, quantity: data.quantity, price: (data.sell * purchaseQty) + " " + data.currency, type: 'sell' });
						else {
							const sheet = new cls(entry, { render: false });
							await sheet.addItem(msgitem);
							sheet.addLog.call(entry, { actor: actor.name, item: actoritem.name, quantity: data.quantity, price: (data.sell * purchaseQty) + " " + data.currency, type: 'sell' });
						}

						$('input', content).remove();
						$('.item-quantity span, .item-price span', content).removeClass('player-only').show();
						$('.request-buttons', content).remove();
						$('input', content).remove();
						$('.item-quantity span, .item-price span', content).removeClass('player-only').show();
						$('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-check"></i> ${i18n("MonksEnhancedJournal.msg.SoldToShop")}</span>`);
					}
				}
			}
		} else {
			accepted = false;
			$('.request-buttons', content).remove();
			$('input', content).remove();
			$('.item-quantity span, .item-price span', content).removeClass('player-only').show();
			$('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-times"></i> ${format("MonksEnhancedJournal.msg.SaleHasBeenAction", { verb: (status == 'reject' ? i18n("MonksEnhancedJournal.Rejected").toLowerCase() : i18n("MonksEnhancedJournal.Cancelled").toLowerCase())})}</span>`);
		}

		message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { accepted: !!accepted, offered: !!offered, approved: !!approved } } });
	}

	static updateSale(event) {
		let message = this;

		let content = $(message.content);
		let id = $(event.currentTarget).closest('li').attr('data-id');

		let items = foundry.utils.duplicate(message.getFlag('monks-enhanced-journal', 'items') || {});
		let item = items.find(i => i._id == id);
		if (item == undefined)
			return;

		let html = $(event.currentTarget).closest('ol.item-list');

		let quantity = parseInt($(`li[data-id="${id}"] input[name="flags.monks-enhanced-journal.quantity"]`, html).val());
		foundry.utils.setProperty(item, "flags.monks-enhanced-journal.quantity", quantity);
		$(`li[data-id="${id}"] .item-quantity span`, content).html(quantity);

		if ($(`li[data-id="${id}"] input[name="flags.monks-enhanced-journal.sell"]`, html).length) {
			let data = foundry.utils.getProperty(item, "flags.monks-enhanced-journal");

			let sell = $(`li[data-id="${id}"] input[name="flags.monks-enhanced-journal.sell"]`, html).val();
			let price = MEJHelpers.getPrice(sell);

			data.sell = price.value;
			data.currency = price.currency;
			data.total = data.quantity * data.sell;

			foundry.utils.setProperty(item, "flags.monks-enhanced-journal", data);

			$(`li[data-id="${id}"] input[name="sell"]`, html).val(data.sell + ' ' + price.currency);

			$(`li[data-id="${id}"] .item-price span`, content).html(data.sell + ' ' + price.currency);
			$(`li[data-id="${id}"] .item-total span`, content).html(data.total + ' ' + price.currency);
		}

		message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { items: items } } });
	}

	static async openRequestItem(type, event) {
		let options = { editable: type != 'item' };
		let document;
		if (type == 'actor') {
			document = game.actors.get(this.flags['monks-enhanced-journal'].actor.id);
		} else if (type == 'shop') {
			document = await fromUuid(this.flags['monks-enhanced-journal'].shop.uuid);

			if (await MonksEnhancedJournal.openJournalEntry(document))
				return;

			// if it's a journal entry, then check to see if it's an MEJ sheet, then switch to the page
			if (document instanceof JournalEntry && document.pages.size == 1 && !!foundry.utils.getProperty(this.document.pages.contents[0], "flags.monks-enhanced-journal.type")) {
				document = this.document.pages.contents[0];
			}

			if (document instanceof JournalEntryPage) {
				// Fix the page, and confirm that it's an MEJ type, otherwise switch to the parent, with the page as a link
				MonksEnhancedJournal.fixType(document);
				let type = foundry.utils.getProperty(document, "flags.monks-enhanced-journal.type");
				if (type == "base" || type == "oldentry") type = "journalentry";
				let types = MonksEnhancedJournal.getDocumentTypes();
				if (!types[type]) {
					options.pageId = document.id;
					document = document.parent;
				}
			}
		} else if (type == 'item') {
			let li = $(event.currentTarget).closest('li')[0];
			if (li.dataset.uuid)
				document = await fromUuid(li.dataset.uuid);
			else {
				let items = this.getFlag('monks-enhanced-journal', 'items') || {};
				let itemData = items[li.dataset.id];
				document= new CONFIG.Item.documentClass(itemData);
			}
		}

		if (document)
			document.sheet.render(true, options);
	}

	static async makeOffering(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.uuid);
			if (entry) {
				let offerings = foundry.utils.duplicate(entry.getFlag("monks-enhanced-journal", "offerings") || []);
				data.offering.id = makeid();
				offerings.unshift(data.offering);
				await entry.setFlag("monks-enhanced-journal", "offerings", offerings);
			}
		}
	}

	static async transferCurrency(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.uuid);
			if (entry) {
				await entry.setFlag('monks-enhanced-journal', 'currency', data.currency);
			}
		}
	}

	static async cancelOffer(data) {
		if (game.user.isGM) {
			let entry = await fromUuid(data.uuid);
			if (entry) {
				let offerings = foundry.utils.duplicate(entry.getFlag("monks-enhanced-journal", "offerings"));
				let offering = offerings.find(r => r.id == data.id);
				offering.hidden = true;
				offering.state = "cancelled";
				await entry.setFlag('monks-enhanced-journal', "offerings", offerings);
			}
		}
	}

	static journalListing(ctrl, html, id, name, documentId = 'documentId', fn) {
		function selectItem(event) {
			event.preventDefault();
			event.stopPropagation();
			$(`[name="${documentId}"]`, html).val(this.id);
			$('> div > span', ctrl.next()).html(this.name);
			$('.journal-list.open').removeClass('open');
			$(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
			if (fn) fn(this.id, this.name);
		}

		function _sortAlphabetical(a, b) {
			if (a.name === undefined) throw new Error(`Missing name property for ${a.constructor.name} ${a.id}`);
			if (b.name === undefined) throw new Error(`Missing name property for ${b.constructor.name} ${b.id}`);
			return a.name.localeCompare(b.name);
		}

		function _sortStandard(a, b) {
			if (a.sort === undefined) throw new Error(`Missing sort property for ${a.constructor.name} ${a.id}`);
			if (b.sort === undefined) throw new Error(`Missing sort property for ${b.constructor.name} ${b.id}`);
			return a.sort - b.sort;
		}

		function getFolders(folders) {
			return folders.sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; }).map(f => {
				let sort = f.sorting === "a" ? _sortAlphabetical : _sortStandard;
				return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').append($("<i>").addClass(`fas fa-folder-open`)).append(f.name)).append(
					$('<ul>')
						.addClass('subfolder')
						.append(getFolders(f.children.map(c => c.folder)))
						.append((f.contents || [])
							.sort(sort)
							.map(e => { return $('<li>').addClass('journal-item flexrow').toggleClass('selected', id == e.id).attr('id', e.id).html($('<div>').addClass('journal-title').html(e.name)).click(selectItem.bind(e)) })))
					.click(function (event) { event.preventDefault(); event.stopPropagation(); $(this).toggleClass('collapse'); });
			});
		}

		let list = $('<ul>')
			.addClass('journal-list')
			.append($('<li>').addClass('journal-item flexrow').toggleClass('selected', !id).attr('id', '').html($('<div>').addClass('journal-title').html('')).click(selectItem.bind({ id: '', name: '' })))
			.append(getFolders(game.journal.folders.filter(f => f.folder == null)))
			.append(game.journal.contents
				.filter(j => j.folder == null)
				.sort(_sortStandard)
				.map(j => { return $('<li>').addClass('journal-item').attr('id', j.id).html($('<div>').addClass('journal-title').html(j.name)).click(selectItem.bind(j)); }));

		$(html).click(function () { list.removeClass('open') });

		return $('<div>')
			.addClass('journal-select')
			.attr('tabindex', '0')
			.append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').html(name)).append($('<i>').addClass('fas fa-chevron-down')))
			.append(list)
			//.focus(function () { list.addClass('open') })
			//.blur(function () { list.removeClass('open') })
			.click(function (evt) { list.toggleClass('open'); evt.preventDefault(); evt.stopPropagation(); });
	}

	static async lootEntryListing(ctrl, html, collection = game.journal, uuid) {
		async function selectItem(event) {
			event.preventDefault();
			event.stopPropagation();
			let id = event.currentTarget.dataset.uuid;
			$(`[name="monks-enhanced-journal.loot-entity"]`, html).val(id).change();

			let name = await getEntityName(id);

			$('.journal-select-text', ctrl.next()).html(name);
			$('.journal-list.open').removeClass('open');
			$(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
		}

		async function getEntityName(id) {
			let entity = null;
			try {
				entity = (id ? await fromUuid(id) : null);
			} catch { }

			if (entity instanceof JournalEntryPage || entity instanceof Actor)
				return "Adding to " + entity.name;
			else if (entity instanceof JournalEntry)
				return "Adding new loot page to " + entity.name;
			else if (entity instanceof Folder)
				return (entity.documentClass.documentName == "JournalEntry" ? "Creating new Journal Entry within " + entity.name + " folder" : "Creating Actor within " + entity.name + " folder");
			else if (id == "root") {
				let lootsheet = setting('loot-sheet');
				let isLootActor = ['lootsheetnpc5e', 'merchantsheetnpc', 'item-piles'].includes(lootsheet);
				return `Creating ${isLootActor ? "Actor" : "Journal Entry"} in the root folder`;
			} else
				return "Unknown";
		}

		function getEntries(folderID, contents) {
			let result = [$('<li>').addClass('journal-item create-item').attr('data-uuid', folderID || "root").html($('<div>').addClass('journal-title').toggleClass('selected', uuid == undefined).html("-- create entry here --")).click(selectItem.bind())];
			return result.concat((contents || [])
				.filter(c => {
					return (c instanceof JournalEntry && c.pages.size == 1 && foundry.utils.getProperty(c.pages.contents[0], "flags.monks-enhanced-journal.type") == "loot") || (c instanceof Actor)
				})
				.sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; })
				.map(e => {
					return $('<li>').addClass('journal-item flexrow').toggleClass('selected', uuid == (e.pages?.contents[0].uuid || e.uuid)).attr('data-uuid', e.pages?.contents[0].uuid || e.uuid).html($('<div>').addClass('journal-title').html(e.name)).click(selectItem.bind())
				}));
		}

		function createFolder(folder, icon = "fa-folder-open") {
			return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').append($("<i>").addClass(`fas ${icon}`)).append(folder.name)).append(
				$('<ul>')
					.addClass('subfolder')
					.append(getFolders(folder?.children?.map(c => c.folder)))
					.append(getEntries(folder.uuid, folder.documents || folder.contents)))
			   .click(function (event) { event.preventDefault(); event.stopPropagation(); $(this).toggleClass('collapse'); });
		}

		function getFolders(folders) {
			return (folders || []).sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; }).map(f => {
				return createFolder(f);
			});
		}

		let list = $('<ul>')
			.addClass('journal-list')
			.append(getFolders(collection.folders.filter(f => f.folder == null)))
			.append(getEntries(null, collection.contents.filter(j => j.folder == null)));

		$(html).click(function () { list.removeClass('open') });

		let name = await getEntityName(uuid);

		return $('<div>')
			.addClass('journal-select')
			.attr('tabindex', '0')
			.append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').addClass("journal-select-text").html(name)).append($('<i>').addClass('fas fa-chevron-down')))
			.append(list)
			.click(function (evt) { $('.journal-list', html).removeClass('open'); list.toggleClass('open'); evt.preventDefault(); evt.stopPropagation(); });
	}

	static noteIcons(ctrl, html, value) {
		function selectItem(value, name, event) {
			event.preventDefault();
			event.stopPropagation();
			if (Object.values(CONFIG.JournalEntry.noteIcons).find(i => i == value) == undefined) {
				$(`[name="icon.selected"]`, html).val('');
				$(`[name="icon.custom"]`, html).val(value).prop('disabled', false);
				$(`[data-target="icon.custom"]`, html).prop('disabled', false);
			} else {
				$(`[name="icon.selected"]`, html).val(value);
				$(`[name="icon.custom"]`, html).val('').prop('disabled', true);
				$(`[data-target="icon.custom"]`, html).prop('disabled', true);
			}
			$(' > div > span', this.next()).html(name);
			$('.journal-list.open').removeClass('open');
			$(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
		}

		function loadCustom(event) {
			event.preventDefault();
			event.stopPropagation();

			let filePicker = new foundry.applications.apps.FilePicker.implementation({
				type: "image",
				callback: path => {
					$(`[name="icon.selected"]`, html).val('');
					$(' > div > span', ctrl.next()).html(i18n("MonksEnhancedJournal.Custom"));
					$(`[name="icon.custom"]`, html).val(path).prop('disabled', false);
					$(`[data-target="icon.custom"]`, html).prop('disabled', false);
					list.removeClass('open');
				},
			});
			filePicker.render();
		}

		let name = "";
		let list = $('<ul>')
			.addClass('journal-list')
			.append(Object.entries(CONFIG.JournalEntry.noteIcons)
				.sort(([a,], [b,]) => a.localeCompare(b))
				.map(([k, v]) => {
					if (value == v)
						name = k;
					return $('<li>')
						.addClass('journal-item note-item')
						.toggleClass("selected", v == value)
						.attr('value', v)
						.append(
							$('<div>')
								.addClass('journal-title flexrow')
								.append($('<img>').addClass('journal-icon').attr('src', v))
								.append($('<span>').addClass('journal-text').html(k))
						).click(selectItem.bind(ctrl, v, k));
				}))
			.append($('<li>')
				.addClass('journal-item note-item')
				.append(
					$('<div>')
						.addClass('journal-title custom-note flexrow')
						.append($('<span>').addClass('journal-text custom-text').html(i18n("MonksEnhancedJournal.msg.ClickCustomImage")))
				).click(loadCustom.bind(ctrl)));

		$(html).click(function () { list.removeClass('open') });

		if (value?.length && Object.values(CONFIG.JournalEntry.noteIcons).find(i => i == value) == undefined && !name.length) {
			name = i18n("MonksEnhancedJournal.Custom");
			$(`[name="icon.selected"]`, html).val('');
		}

		return $('<div>')
			.addClass('journal-select')
			.attr('tabindex', '0')
			.append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').html(name)).append($('<i>').addClass('fas fa-chevron-down')))
			.append(list)
			.click(function (evt) { $('.journal-list', html).removeClass('open'); list.toggleClass('open'); evt.preventDefault(); evt.stopPropagation(); });
	}

	static convertReward() {
		if (MonksEnhancedJournal.journal) {
			if (!(MonksEnhancedJournal.journal.subsheet instanceof QuestSheet)) {
				console.log('Invalid journal type');
				return;
			}

			let rewards = MonksEnhancedJournal.journal.subsheet.convertRewards();
			MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
			MonksEnhancedJournal.journal.render(true);
		}
	}

	static fixType(object, settype) {
		if (object?.documentName == 'JournalEntryPage') {
			let types = MonksEnhancedJournal.getDocumentTypes();

			let type = settype || object?.flags['monks-enhanced-journal']?.type;
			if (!type && object.parent.documentName == 'JournalEntry') {
				type = object.parent?.flags['monks-enhanced-journal']?.type;
			}
			type = (type == 'base' || type == 'oldentry' ? 'journalentry' : type);
			type = (type == 'checklist' ? 'list' : type);

			/*
			if (game.modules.get('_document-sheet-registrar')?.active) {
				if (object.getFlag('_document-sheet-registrar', 'type') == undefined) {
					if(!object?.compendium?.locked)
						object.setFlag('_document-sheet-registrar', 'type', type);
					object.flags["_document-sheet-registrar"] = { type: type };
					warn(`Lib: Document Sheet Registrar is causing errors with Enhanced Journal.  It's recommended that you disable it`);
				} else if (!object?.compendium?.locked)
					object.setFlag('_document-sheet-registrar', 'type', type);
			} //else {
				//object.type = type;    //set the type of all entries since Foundry won't save the new type
			//}
			*/
			type = type || object.type;
			if (types[type])
				object.type = type;
			else if (game.user.isGM)
				object.unsetFlag("monks-enhanced-journal", "type");

			return type;
		} else if (["blank", "folder"].includes(foundry.utils.getProperty(object, "flags.monks-enhanced-journal.type"))) {
			object.type = foundry.utils.getProperty(object, "flags.monks-enhanced-journal.type");
		}
	}

	static getLootSheetOptions(lootType) {
		let lootsheetoptions = { 'monks-enhanced-journal': "Monk's Enhanced Journal" };
		if (game.modules.get("lootsheetnpc5e")?.active)
			lootsheetoptions['lootsheetnpc5e'] = "Loot Sheet NPC 5e";
		if (game.modules.get("merchantsheetnpc")?.active)
			lootsheetoptions['merchantsheetnpc'] = "Merchant Sheet NPC";
		if (game.modules.get("item-piles")?.active)
			lootsheetoptions['item-piles'] = "Item Piles";

		return lootsheetoptions;
	}

	static get defaultCurrencies() {
		switch (game.system.id) {
			case "sw5e":
				return [{ id: "gc", name: i18n("MonksEnhancedJournal.currency.galacticcredit"), convert: 0 }];
			case "sfrpg":
				return [{ id: "upb", name: i18n("MonksEnhancedJournal.currency.upb"), convert: 1 }, { id: "cr", name: "Credit", convert: 0 }];
			case "swade":
				return [{ id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 }];
			case "age-system":
				return [
					{ id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
					{ id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
					{ id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
				];
			case "cyphersystem":
				return [
					{ id: 'am', name: i18n('CYPHERSYSTEM.Adamantine'), convert: 1000 },
					{ id: 'mt', name: i18n('CYPHERSYSTEM.Mithral'), convert: 100 },
					{ id: 'pt', name: i18n('CYPHERSYSTEM.Platinum'), convert: 10 },
					{ id: 'gp', name: i18n('CYPHERSYSTEM.Gold'), convert: 0 },
					{ id: 'sp', name: i18n('CYPHERSYSTEM.Silver'), convert: 0.1 },
					{ id: 'cp', name: i18n('CYPHERSYSTEM.Copper'), convert: 0.01 }
				];
			case "TheWitcherTRPG":
				return [
					{ id: 'bizant', name: i18n('WITCHER.Currency.bizant'), convert: 4 },
					{ id: 'ducat', name: i18n('WITCHER.Currency.ducat'), convert: 0.333333333 },
					{ id: 'lintar', name: i18n('WITCHER.Currency.lintar'), convert: 2 },
					{ id: 'floren', name: i18n('WITCHER.Currency.floren'), convert: 3 },
					{ id: 'crown', name: i18n('WITCHER.Currency.crown'), convert: 0 },
					{ id: 'oren', name: i18n('WITCHER.Currency.oren'), convert: 6 },
					{ id: 'falsecoin', name: i18n('WITCHER.Currency.falsecoin'), convert: 0.01 }
				];
			case "wfrp4e":
				return [
					{ id: 'gc', name: "Gold Crown", convert: 0 },
					{ id: 'ss', name: "Silver Shilling", convert: 20 },
					{ id: 'bp', name: "Brass Penny", convert: 240 }
				];
			case "archmage":
				return [
					{ id: 'platinum', name: "Gold Crown", convert: 10 },
					{ id: 'gold', name: "Silver Shilling", convert: 0 },
					{ id: 'silver', name: "Brass Penny", convert: 0.1 },
					{ id: 'copper', name: "Brass Penny", convert: 0.01 }
				];
			case "tormenta20":
				return [
					{ id: "to", name: "TO", convert: 1 },
					{ id: "tp", name: "T$", convert: 0 },
					{ id: "tc", name: "TC", convert: 1 }
				];
			case "starwarsffg":
				return [{ id: "cr", name: i18n("MonksEnhancedJournal.currency.credit"), convert: 0 }];
			case "shadowrun5e":
				return [{ id: "ny", name: i18n("MonksEnhancedJournal.currency.nuyen"), convert: 0 }];
			case "fallout":
				return [{ id: "caps", name: i18n("MonksEnhancedJournal.currency.caps"), convert: 0 }];
			case "earthdawn4e":
				return [
					{ id: "gold", name: i18n("MonksEnhancedJournal.currency.merchants"), convert: 0 },
					{ id: "silver", name: i18n("MonksEnhancedJournal.currency.tavs"), convert: 0.1 },
					{ id: "copper", name: i18n("MonksEnhancedJournal.currency.hammer"), convert: 0.01 }
				];
			case "dnd5e":
			case "dnd4e":
			case "dnd3e":
			case "a5e":
				return [
					{ id: "pp", name: i18n("MonksEnhancedJournal.currency.platinum"), convert: 10 },
					{ id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
					{ id: "ep", name: i18n("MonksEnhancedJournal.currency.electrum"), convert: null },
					{ id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
					{ id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
				];
			case "pf2e":
			case "pf1e":
			case "pf1":
			case "D35E":
				return [
					{ id: "pp", name: i18n("MonksEnhancedJournal.currency.platinum"), convert: 10 },
					{ id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
					{ id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
					{ id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
				];
			case "ds4":
				return [
					{ id: "gold", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
					{ id: "silver", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
					{ id: "copper", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
				];
			case "dsa5":
				return [
					{ id: "Money-D", name: i18n("Money-D"), convert: 10 },
					{ id: "Money-S", name: i18n("Money-S"), convert: 0 },
					{ id: "Money-H", name: i18n("Money-H"), convert: 0.1 },
					{ id: "Money-K", name: i18n("Money-K"), convert: 0.01 }
				];
			case "pirateborg":
				return [
					{ id: "silver", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0 },
				];
			case 'demonlord':
				return [
					{ id: "gc", name: "gc", convert: 10 },
					{ id: "ss", name: "ss", convert: 0 },
					{ id: "cp", name: "cp", convert: 0.1 },
					{ id: "bits", name: "bits", convert: 0.01 }
				];
			default:
				return [];
		}
	}

	static get currencies() {
		let currency = game.settings.get('monks-enhanced-journal', 'currency');
		return (currency.length == 0 || currency[0] == null ? MonksEnhancedJournal.defaultCurrencies : currency).sort((a, b) => {
			let a_c = (a.convert == 0 ? 1 : (a.convert == 1 ? 0 : a.convert));
			let b_c = (b.convert == 0 ? 1 : (b.convert == 1 ? 0 : b.convert));
			return b_c - a_c;
		});
	}

	static isLootActor(lootsheet) {
		return ['lootsheetnpc5e', 'merchantsheetnpc', 'item-piles'].includes(lootsheet);
	}
}

Hooks.on("renderJournalDirectory", async (app, html, options) => {
	//add journal indicators
	//log('rendering journal directory', app, html, options);
	if (MonksEnhancedJournal.journal) {
		MonksEnhancedJournal.journal.render();
	}

	MonksEnhancedJournal.updateDirectory(html, true);
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
	$('[name="monks-enhanced-journal.loot-sheet"]', html).on('change', async () => {
		let sheet = $('[name="monks-enhanced-journal.loot-sheet"]', html).val();

		let entityid = setting('loot-entity');
		let ctrl = $('[name="monks-enhanced-journal.loot-entity"]', html);
		if (ctrl.next().hasClass("journal-select"))
			ctrl.next().remove();
		let list = await MonksEnhancedJournal.lootEntryListing(ctrl, html, (sheet == "monks-enhanced-journal" ? game.journal : game.actors), entityid);
		list.insertAfter(ctrl);
		ctrl.hide();
	}).change();

	$('[name="monks-enhanced-journal.loot-entity"]', html).on('change', async () => {
		let entity = $('[name="monks-enhanced-journal.loot-entity"]', html).val();

		$('[name="monks-enhanced-journal.loot-name"]', html).closest('.form-group').toggle(entity.startsWith("Folder") || !entity);
	}).change();

	$('[name="monks-enhanced-journal.loot-name"]', html).val(i18n($('[name="monks-enhanced-journal.loot-name"]', html).val()));
});

Hooks.once("init", async function () {
	MonksEnhancedJournal.init();
});

Hooks.once("ready", async function () {
	MonksEnhancedJournal.ready();
});

Hooks.on("preCreateJournalEntryPage", (entry, data, options, userId) => {
	if (data.type) {
		if (entry.flags["monks-enhanced-journal"] == undefined || Object.keys(entry.flags["monks-enhanced-journal"]).length == 1) {
			let type = data.type;
			if (type == "base" || type == "oldentry") type = "journalentry";

			let types = MonksEnhancedJournal.getDocumentTypes();
			if (types[type]) {
				let flags = foundry.utils.getProperty("flags.monks-enhanced-journal") || {};
				flags.type = type;

				MonksEnhancedJournal.fixType(entry);
				const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
				if (cls && cls.defaultObject)
					flags = foundry.utils.mergeObject(flags, cls.defaultObject);

				entry._source.flags['monks-enhanced-journal'] = flags;
			}
		}
	}
});

Hooks.on("createJournalEntryPage", (entry, options, userId) => {
	let type = foundry.utils.getProperty(entry, "flags.monks-enhanced-journal.type");
	if (type) {
		if (type == "base" || type == "oldentry") type = "journalentry";
		let types = MonksEnhancedJournal.getDocumentTypes();
		if (types[type]) {
			let docIcon = "fa-book";
			if (entry.parent.pages.size == 1) {
				docIcon = MonksEnhancedJournal.getIcon(type);
			}
			$(`.document.journalentry[data-entry-id="${entry.parent.id}"] .entry-name .journal-type`).attr('class', 'journal-type fas fa-fw ' + docIcon);
		}
	} else {
		// If this page's parent is the currently rendered journal, re-render the journal
		if (MonksEnhancedJournal.journal && entry.parent.id === MonksEnhancedJournal.journal.document.id) {
			MonksEnhancedJournal.journal.render({ force: false });
		}
	}
});

Hooks.on("preCreateJournalEntry", (document, data, options, userId) => {
	let type = foundry.utils.getProperty(data, "flags.monks-enhanced-journal.pagetype");
	let types = MonksEnhancedJournal.getDocumentTypes();
	if (types[type]) {
		let flags = foundry.utils.getProperty(data, "flags.monks-enhanced-journal") || {};
		flags.img = `modules/monks-enhanced-journal/assets/${type}.png`;

		foundry.utils.setProperty(data, "flags.monks-enhanced-journal", flags);
		foundry.utils.setProperty(document, "flags.monks-enhanced-journal", flags);
	}
});

Hooks.on("updateJournalEntry", (document, data, options, userId) => {
	if (MonksEnhancedJournal.getMEJType(document) == 'quest')
		MonksEnhancedJournal.refreshObjectives(true);

	if (MonksEnhancedJournal.journal) {
		if (data.name) {
			MonksEnhancedJournal.journal.updateTabNames(document.uuid, data.name);
		}
	}
});

Hooks.on("updateJournalEntryPage", (document, data, options, userId) => {
	let type = foundry.utils.getProperty(document, 'flags.monks-enhanced-journal.type');
	if (type == 'quest')
		MonksEnhancedJournal.refreshObjectives(true);

	if (data.name && type && document.parent.pages.size == 1) {
		document.parent.update({name: data.name});
	}

	if (foundry.utils.getProperty(data, "flags.monks-enhanced-journal.status") != undefined) {
		$(`.journalentry[data-entry-id="${document.parent.id}"]`).attr("status", foundry.utils.getProperty(data, "flags.monks-enhanced-journal.status"));
	}

	let flags = foundry.utils.getProperty(data, "flags.monks-enhanced-journal") || {};
	let renderUpdateKeys = [
		"name",
		"src",
		"actor",
		"actors",
		"relationships",
		"currency",
		"items",
		"type",
		"attributes",
		"slides",
		"font",
		"dcs",
		"traps",
		"objectives",
		"folders",
		"reward",
		"rewards",
		"sound",
		"offerings",
		"state",
		"opening",
		"closing",
		"log",
		"subtype",
		"shoptype",
		"placetype",
		"location",
		"status",
		"source",
		"display",
		"purchasing",
		"selling",
		"autoopen",
		"alignment",
		"role",
		"date",
		"entries",
		game.user.id
	];

	let renderUpdate = renderUpdateKeys.some(d => {
		return flags[d] != undefined || data[d] != undefined;
	})

	if (MonksEnhancedJournal.journal) {
		if (!!data.name) {
			MonksEnhancedJournal.journal.updateTabNames(document.uuid, document.name);
		}

		if (MonksEnhancedJournal.journal.tabs.active().entityId?.endsWith(data._id) &&
			(data.text?.content != undefined ||
				data.ownership != undefined ||
				renderUpdate ||
			foundry.utils.getProperty(data, "flags.core.sheetClass") != undefined))
		{
			MonksEnhancedJournal.journal.render({ tempOwnership: MonksEnhancedJournal.journal.tempOwnership, reload: true, focus: options?.focus !== false });
		} else if (MonksEnhancedJournal.journal && document.parent.id === MonksEnhancedJournal.journal.document.id) {
			MonksEnhancedJournal.journal.render({ force : false });
		}

	} else {
		if (data.content != undefined ||
			data.ownership != undefined ||
			renderUpdate ||
			foundry.utils.getProperty(data, "flags.core.sheetClass") != undefined)
		{
			if (document._sheet && document._sheet.rendered)
				document._sheet.render(true, { reload: true });
		}
	}
});

Hooks.on("deleteJournalEntry", (document, html, userId) => {
	if (MonksEnhancedJournal.journal) {
		MonksEnhancedJournal.journal.deleteEntity(document.uuid);
		if (document.flags['monks-enhanced-journal']?.type == 'quest' && ui.controls.control.name == 'notes' && setting('show-objectives'))
			MonksEnhancedJournal.refreshObjectives(true);
	}
});

Hooks.on("deleteJournalEntryPage", (document, html, userId) => {
	if (MonksEnhancedJournal.journal && document.parent.id === MonksEnhancedJournal.journal.document.id) {
		MonksEnhancedJournal.journal.render({ force: false });
	}
});

Hooks.on('renderSceneControls', (controls) => {
	MonksEnhancedJournal.refreshObjectives();
});

Hooks.on('dropActorSheetData', (actor, sheet, data) => {
	//check to see if an item was dropped from either the encounter or quest and record what actor it was
	if (MonksEnhancedJournal._dragItem && data.itemId == MonksEnhancedJournal._dragItem) {
		MonksEnhancedJournal._dragItem = null;

		let page = fromUuidSync(data.uuid);
		if (page) {
			MonksEnhancedJournal.fixType(page);
			const cls = (page._getSheetClass ? page._getSheetClass() : null);
			if (cls && cls.itemDropped) {
				cls.itemDropped.call(cls, data.itemId, actor, page).then((result) => {
					if ((result?.quantity ?? 0) > 0) {
						let itemQty = Number(getValue(data.data, quantityname()));
						if (isNaN(itemQty)) itemQty = 1;
						setValue(data.data, quantityname(), result.quantity * itemQty);
						if (!setting("use-generic-price"))
							setPrice(data.data, pricename(), result.price);
						data.uuid = `${data.uuid}${data.rewardId ? `.Rewards.${data.rewardId}` : ""}.Items.${data.itemId}`;
						if (sheet._onDropItem && game.system.id != "cyphersystem")
							sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, data.data);
						else
							actor.createEmbeddedDocuments("Item", [data.data]);
					}
				});
			}
		}

		return false;
	}
});

Hooks.on('dropJournalSheetData', (journal, sheet, data) => {
	//check to see if an item was dropped from another Journal Sheet
	if (MonksEnhancedJournal._dragItem && data.itemId == MonksEnhancedJournal._dragItem) {
		MonksEnhancedJournal._dragItem = null;

		let page = fromUuidSync(data.uuid);
		if (page) {
			MonksEnhancedJournal.fixType(page);
			const cls = (page._getSheetClass ? page._getSheetClass() : null);
			if (cls && cls.itemDropped) {
				cls.itemDropped.call(cls, data.itemId, journal, page).then((result) => {
					if (!!result) {
						let itemQty = getValue(data.data, quantityname());
						setValue(data.data, quantityname(), result.quantity * itemQty);
						data.uuid = `${data.uuid}.Items.${data.itemId}`;
						sheet._onDropItem({ preventDefault: () => { }, target: { closest: () => { } } }, data);
					}
				});
			}
		}
		return false;
	}
});

Hooks.on('dropCanvasData', async (canvas, data) => {
	//check to see if an item was dropped from either the encounter or quest and record what actor it was
	if (MonksEnhancedJournal.journal) {
		if (data.type == 'JournalTab' && data.uuid) {
			let document = await fromUuid(data.uuid);
			if (document) {
				MonksEnhancedJournal.fixType(document);
				document.sheet.render(true);
			}
		} /*else if (data.type == 'CreateEncounter' || data.type == 'CreateCombat') {
			if (!game.user.can("TOKEN_CREATE")) {
				return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDoNotHavePermissionCreateToken"));
			}

			let encounter = await fromUuid(data.uuid);
			if (encounter) {
				MonksEnhancedJournal.fixType(encounter);
				const cls = (encounter._getSheetClass ? encounter._getSheetClass() : null);
				if (cls && cls.createEncounter) {
					const templateData = {
						t: "circle",
						user: game.user.id,
						direction: 0,
						x: data.x,
						y: data.y,
						fillColor: game.user.color,
						flags: { "monks-enhanced-journal": { encounter: data.uuid } }
					};

					const template = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
					const object = new foundry.canvas.placeables.MeasuredTemplate(template);
					//object.drawPreview();

					//cls.createEncounter.call(encounter, data.x, data.y, data.type == 'CreateCombat');
				}
			}
		}*/
	}
});

/*
Hooks.on("renderFolderConfig", (app, html, options) => {
	let defaultType = app.document.getFlag('monks-enhanced-journal', 'defaulttype');

	$('<div>')
		.addClass('form-group')
		.append($('<label>').html('Default Entry Type'))
		.append($('<div>')
			.addClass('form-fields')
			.append($('<select>')
				.attr('name', 'flags.monks-enhanced-journal.defaulttype')
				.append(Object.entries(MonksEnhancedJournal.getTypeLabels()).map(([k, v]) => {
					return $('<option>').attr('value', k).html(i18n(v)).prop('selected', defaultType == k);
				}))))
		.insertAfter($('input[name="sorting"]', html).closest('.form-group'));

	$(html).css({height: $(html).height() + 30});
});*/

Hooks.on('renderNoteConfig', (app, html, data) => {
	let ctrl = $('select[name="entryId"]', html);

	MonksEnhancedJournal.journalListing(ctrl, html, app.document.entryId, data.entry.name, "entryId", (id, name) => {
		$('[name="text"]', html).attr("placeholder", name);

		let mejSheet = false;
		let journal = game.journal.get(id);
		if (journal?.pages?.size == 1 && (!!foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || !!foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type"))) {
			let type = foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type");
			if (type == "base" || type == "oldentry") type = "journalentry";
			let types = MonksEnhancedJournal.getDocumentTypes();
			if (types[type]) {
				mejSheet = true;
			}
		}

		// refresh page list
		const pages = journal?.pages.contents.sort((a, b) => a.sort - b.sort) ?? [];
		const options = pages.map(page => {
			const selected = (page.id === app.document.pageId);
			return `<option value="${page.id}"${selected ? " selected" : ""}>${page.name}</option>`;
		});
		$('select[name="pageId"]', html).empty().append(`<option></option>${options}`);

		// check if the page list and anchor should be shown
		$('select[name="pageId"]', html).closest('.form-group').toggle(!mejSheet);

		app.setPosition({ height: 'auto' });
	}).insertAfter(ctrl);
	ctrl.hide();

	ctrl = $('select[name="icon.selected"]', html);

	MonksEnhancedJournal.noteIcons(ctrl, html, app.document.texture.src).insertAfter(ctrl);
	ctrl.hide();

	$('<div>').addClass('form-group')
		.append($('<label>').html(i18n("MonksEnhancedJournal.ChatBubble")))
		.append(
			$('<div>').addClass('form-fields')
				.append($('<input>').attr('type', 'checkbox').attr('name', 'flags.monks-enhanced-journal.chatbubble').prop('checked', app.document.flags['monks-enhanced-journal']?.chatbubble))
	).insertAfter($('select[name="textAnchor"]', html).closest('.form-group'));

	let mejSheet = false;
	let journal = data.entry;
	if (journal?.pages?.size == 1 && (!!foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || !!foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type"))) {
		let type = foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type");
		if (type == "base" || type == "oldentry") type = "journalentry";
		let types = MonksEnhancedJournal.getDocumentTypes();
		if (types[type]) {
			mejSheet = true;
		}
	}

	$('select[name="pageId"]', html).closest('.form-group').toggle(!mejSheet);

	app.setPosition({ height: 'auto' });
});

Hooks.on("renderTokenConfig", (app, html, data) => {
	if (game.user.isGM) {
		let ctrl = $('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.chatbubble').val(foundry.utils.getProperty(data, 'object.flags.monks-enhanced-journal.chatbubble'));
		let group = $('<div>').addClass('form-group')
			.append($('<label>').html(i18n("MonksEnhancedJournal.TokenDialogJournalEntry")))
			.append(ctrl);

		let journalId = app.document.flags['monks-enhanced-journal']?.chatbubble;
		let journal = game.journal.get(journalId);

		let journalSelect = MonksEnhancedJournal.journalListing(ctrl, group, journal?.id, journal?.name, 'flags.monks-enhanced-journal.chatbubble');
		ctrl.hide();
		group.append(journalSelect);

		let select = $('.journal-select', group);
		let ul = $('.journal-list', group);//.appendTo(app.element);
		/*
		window.setTimeout(function () {
			ul.css({ left: select.position().left, top: (select.position().top + select.height() + 1), width: select.outerWidth() });
		}, 100);
		*/

		$('[name="actorLink"]', html).closest(".form-group").after(group);

		app.setPosition({height: 'auto'});
	}
});

Hooks.on("renderSceneConfig", (app, html, data) => {
	if (game.user.isGM) {
		let ctrl = $('select[name="journal"]', html);
		let journal = app.document.journal;

		MonksEnhancedJournal.journalListing(ctrl, html, journal?.id, journal?.name, 'journal', (id, name) => {
			let mejSheet = false;
			let journal = game.journal.get(id);
			if (journal?.pages?.size == 1 && (!!foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || !!foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type"))) {
				let type = foundry.utils.getProperty(journal?.pages?.contents[0], "flags.monks-enhanced-journal.type") || foundry.utils.getProperty(journal, "flags.monks-enhanced-journal.type");
				if (type == "base" || type == "oldentry") type = "journalentry";
				let types = MonksEnhancedJournal.getDocumentTypes();
				if (types[type]) {
					mejSheet = true;
				}
			}

			// refresh page list
			const pages = journal?.pages.contents.sort((a, b) => a.sort - b.sort) ?? [];
			const options = pages.map(page => {
				const selected = (page.id === app.document.journalEntryPage);
				return `<option value="${page.id}"${selected ? " selected" : ""}>${page.name}</option>`;
			});
			$('select[name="journalEntryPage"]', html).empty().append(`<option></option>${options}`);

			// check if the page list and anchor should be shown
			$('select[name="journalEntryPage"]', html).closest('.form-group').toggle(!mejSheet);

			app.setPosition({ height: 'auto' });
		}).insertAfter(ctrl);
		ctrl.hide();
	}
});

Hooks.on("preDocumentSheetRegistrarInit", (settings) => {
	settings["JournalEntry"] = true;
});

Hooks.on("renderChatMessageHTML", (message, html, data) => {
	if (message.flags['monks-enhanced-journal']) {
		if (!game.user.isGM)
			$(".gm-only", html).remove();
		if (game.user.isGM)
			$(".player-only", html).hide();

		$('.request-accept', html).click(MonksEnhancedJournal.acceptItem.bind(message, 'accept'));
		$('.request-reject', html).click(MonksEnhancedJournal.acceptItem.bind(message, game.user.isGM ? 'reject' : 'cancel'));
		if (message.getFlag('monks-enhanced-journal', 'action') == "sell") {
			let offered = message.getFlag('monks-enhanced-journal', 'offered');
			let approved = message.getFlag('monks-enhanced-journal', 'approved');

			$('.request-accept', html).toggleClass('active', (game.user.isGM ? !!offered : !!approved)).prop('disabled', !game.user.isGM && !offered);
		}

		$('input[name="flags.monks-enhanced-journal.quantity"]', html).change(MonksEnhancedJournal.updateSale.bind(message));
		$('input[name="flags.monks-enhanced-journal.sell"]', html).change(MonksEnhancedJournal.updateSale.bind(message));

		let items = message.getFlag('monks-enhanced-journal', 'items') || {};
		for (let item of Object.values(items)) {
			$(`li[data-id="${item._id}"] input[name="flags.monks-enhanced-journal.quantity"]`, html).val(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity"));
			$(`li[data-id="${item._id}"] input[name="flags.monks-enhanced-journal.sell"]`, html).val(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.sell") + " " + foundry.utils.getProperty(item, "flags.monks-enhanced-journal.currency"));
		}

		$('.chat-actor-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'actor')).attr('onerror', "$(this).attr('src', 'icons/svg/mystery-man.svg');");
		$('.chat-shop-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'shop')).attr('onerror', "$(this).attr('src', 'modules/monks-enhanced-journal/assets/shop.png');");
		$('.item-list .item-name .item-image', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));
		$('.items-list .item-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));
	} else if (message.flags['journal-chat-card']) {
		$('.link-button', html).on("click", async (ev) => {
			let uuid = ev.currentTarget.dataset.uuid;
			let entry = await fromUuid(uuid);
			if (entry) {
				MonksEnhancedJournal.openJournalEntry(entry);
			}
		})
	}
});

Hooks.on('canvasInit', () => {
	canvas.hud.note = new NoteHUD();
});

Hooks.on("getActorDirectoryEntryContext", (html, entries) => {
	entries.push({
		name: i18n("MonksEnhancedJournal.AssignItemsToThisActor"),
		icon: '<i class="fas fa-suitcase"></i>',
		condition: li => {
			return game.user.isGM && (game.modules.get("merchantsheetnpc")?.active || game.modules.get("lootsheetnpc5e")?.active);
		},
		callback: async (li) => {
			await game.settings.set("monks-enhanced-journal", "loot-entity", li.data("entryId"));
			if (!MonksEnhancedJournal.isLootActor(setting("loot-sheet"))){
				if (game.modules.get("lootsheetnpc5e")?.active)
					await game.settings.set("monks-enhanced-journal", "loot-sheet", "lootsheetnpc5e");
				else if (game.modules.get("merchantsheetnpc")?.active)
					await game.settings.set("monks-enhanced-journal", "loot-sheet", "merchantsheetnpc");
				else if (game.modules.get("item-piles")?.active)
					await game.settings.set("monks-enhanced-journal", "loot-sheet", "item-piles");
			}
			ui.actors.render(true);
		}
	});
});

Hooks.on("getJournalDirectoryEntryContext", (html, entries) => {
	entries.push({
		name: i18n("MonksEnhancedJournal.AssignItemsToThisLootEntry"),
		icon: '<i class="fas fa-suitcase"></i>',
		condition: li => {
			let id = li.data("entryId");
			let journal = game.journal.get(id);
			return game.user.isGM && journal && journal.getFlag('monks-enhanced-journal', 'type') == 'loot';
		},
		callback: async (li) => {
			await game.settings.set("monks-enhanced-journal", "loot-entity", li.data("entryId"));
			if (setting("loot-sheet") != "monks-enhanced-journal")
				await game.settings.set("monks-enhanced-journal", "loot-sheet", "monks-enhanced-journal");
			ui.actors.render(true);
		}
	});
});

//Try and fix what data toolbox is breaking
Hooks.on('getJournalSheetHeaderButtons', (app, actions) => {
	MonksEnhancedJournal.fixType(app.document);
});

Hooks.on("getSceneControlButtons", (controls) => {
	if (setting('show-objectives')) {
		let noteControls = controls.notes;
		noteControls.tools.toggledialog = {
			name: "toggledialog",
			title: "MonksEnhancedJournal.toggledialog",
			icon: "fas fa-calendar-day",
			toggle: true,
			active: setting('show-dialog'),
			onChange: (event, toggled) => {
				game.settings.set('monks-enhanced-journal', 'show-dialog', toggled);
				MonksEnhancedJournal.refreshObjectives();
			}
		};
	}

	if (setting("show-chatbubble")) {
		let tokenControls = controls.tokens;
		tokenControls.tools.tokendialog = {
			name: "tokendialog",
			title: "Toggle Token Dialog Chat Bubbles",
			icon: "fas fa-comment",
			toggle: true,
			active: setting('show-chat-bubbles'),
			onChange: (event, toggled) => {
				game.settings.set('monks-enhanced-journal', 'show-chat-bubbles', toggled);
			}
		};
	}
});

Hooks.on("updateSetting", (setting, data, options, userid) => {
	if (setting.key == "core.sheetClasses" && MonksEnhancedJournal.journal) {
		let value = JSON.parse(data.value);
		if (value.hasOwnProperty("JournalEntry")) {
			MonksEnhancedJournal.journal.render();
		}
	}
});

Hooks.on("polyglot.ready", () => {
	try {
		let root = $('<div>').attr('id', 'enhanced-journal-fonts').appendTo('body');
		let alphabets = game.polyglot.languageProvider?.alphabets;
		if (alphabets) {
			for (let [k, v] of Object.entries(alphabets)) {
				$('<span>').attr('lang', k).css({ font: v }).appendTo(root);
			}
		}
	} catch { }
});

Hooks.on("renderItemSheet", (sheet, html, data) => {
	//Change the price so we can specify the currency type
	if (sheet.options?.alterprice == true) {
		$('input[name="system.price"]', html).attr("name", "flags.monks-enhanced-journal.price").attr('data-dtype', 'String').attr('type', 'text').val(foundry.utils.getProperty(data, "item.flags.monks-enhanced-journal.price"))
	}

	/*
	if (data.options?.addremaining == true) {
		let quantityGroup = $('input[name="system.quantity"]', html).closest('.form-group');
		$('<div>').addClass('form-group')
			.append($('<label>').html(i18n("MonksEnhancedJournal.Remaining")))
			.append($('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.remaining').attr('data-dtype', 'String').val(foundry.utils.getProperty(data, "item.flags.monks-enhanced-journal.remaining")))
			.insertAfter(quantityGroup);
	}
	*/

	if (sheet.options?.addcost == true) {
		let priceGroup = $('input[name="system.price"]', html).closest('.form-group');
		$('<div>').addClass('form-group')
			.append($('<label>').html(i18n("MonksEnhancedJournal.Cost")))
			.append($('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.cost').attr('data-dtype', 'String').val(foundry.utils.getProperty(data, "item.flags.monks-enhanced-journal.cost")))
			.insertAfter(priceGroup);
	}
});

Hooks.on("globalInterfaceVolumeChanged", (volume) => {
	if (!game.modules.get("monks-sound-enhancements")?.active) {
		for (let sound of MonksEnhancedJournal.sounds) {
			sound.volume = (sound.effectiveVolume ?? 1) * volume;
		}
	}
});

Hooks.on("globalSoundEffectVolumeChanged", (volume) => {
	for (let sound of MonksEnhancedJournal.sounds) {
		sound.volume = (sound.effectiveVolume ?? 1) * volume;
	}
});

Hooks.on("renderDialogV2", (dialog, html, data) => {
	if (dialog.options.journalentry) {
		const mejTypes = Object.keys(MonksEnhancedJournal.getDocumentTypes());
		const originalTypes = game.documentTypes.JournalEntryPage.filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
		const original = Object.entries(CONFIG.JournalEntryPage.typeLabels).map(([k, v]) => {
			if (!originalTypes.includes(k) || mejTypes.includes(k.replace("monks-enhanced-journal.", "")))
				return null;
			const name = game.i18n.has(v) ? game.i18n.localize(v) : v;
			return { id: k, name: name };
		})
			.filter(t => !!t)
			.sort((a, b) => { return a.name.localeCompare(b.name); });

		const types = Object.entries(MonksEnhancedJournal.getTypeLabels()).map(([k, v]) => {
			const name = game.i18n.has(v) ? game.i18n.localize(v) : v;
			return { id: k, name: name };
		})
			.filter((t, index, self) => { return self.findIndex(i => i.id == t.id) == index })
			.sort((a, b) => { return a.name.localeCompare(b.name); });

		let select = $("<select>").attr("name", "flags.monks-enhanced-journal.pagetype")
			.append($('<optgroup>').attr("label", "Adventure Book").append(original.map((t) => {
				if (t.id)
				return $('<option>').attr('value', t.id).prop("selected", t.id == "text").html(t.name)
			})))
			.append($('<optgroup>').attr("label", "Single Sheet").append(types.map((t) => {
				if (t.id != "list")
					return $('<option>').attr('value', t.id).html(t.name)
			})))
			.append($('<optgroup>').attr("label", "List")
				.append($('<option>').attr('value', "list:basic").html("Basic"))
				.append($('<option>').attr('value', "list:checklist").html("Checklist"))
				.append($('<option>').attr('value', "list:progress").html("Progress"))
				.append($('<option>').attr('value', "list:poll").html("Poll")))
			/*.on("change", (event) => {
				// Change the text placeholder based on type
				const cls = CONFIG.JournalEntry.documentClass;
				let type = event.currentTarget.value;
				let placeholder = cls.defaultName({ type });
                $('[name="name"]', html).attr("placeholder", placeholder);
			});*/

		if (game.modules.get("storyteller")?.active) {
			select.append($('<optgroup>').attr("label", "Storyteller").append(Object.entries(game.StoryTeller.constructor.types).filter(([k, v]) => k != "base").map(([k, v]) => { return $('<option>').attr('value', k).html(v.name); })));
			$('select[name="type"]', html).parent().parent().remove();
		}

		if (game.modules.get("conversation-hud")?.active) {
			select.append($('<optgroup>').attr("label", "Conversation HUD").append($('<option>').attr('value', "conversation-sheet").html("Conversation")));
			$('select[name="type"]', html).parent().parent().remove();
		}

		$('<div>')
			.addClass("form-group")
			.append($('<label>').html(i18n("Type")))
			.append($('<div>')
				.addClass("form-fields")
				.append(select))
			.insertAfter($('[name="name"]', html).closest('.form-group'));

		/*
		dialog.options.buttons.ok.callback = (event, button) => {
			const fd = new foundry.applications.ux.FormDataExtended(button.form);
			const cls = CONFIG.JournalEntry.documentClass;
			foundry.utils.mergeObject(data, fd.object);
			if (!data.folder) delete data.folder;
			if (!data.name?.trim()) data.name = cls.defaultName({ type: foundry.utils.getProperty(data, "flags.monks-enhanced-journal.pagetype"), parent, pack });
			return cls.create(data, { renderSheet: true });
		}
		*/

		dialog.setPosition({ height: "auto" });
	} else if (dialog.options.journalentrypage) {
		const types = MonksEnhancedJournal.getTypeLabels();
		$('select[name="type"] option').each((index, opt) => {
			if (types[$(opt).attr("value").replace("monks-enhanced-journal.", "")] != undefined)
				$(opt).remove();
		})
	}
});

/*
Hooks.on("renderJournalSheet", (sheet, html, data) => {
	if (sheet._pages) {
		const levels = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
		for (let page of sheet._pages) {
			if (page?.numberIcon) {
				$(`.pages-list li[data-page-id="${page._id}"] .page-number`, html).html(`<i class="fas ${page.numberIcon}"></i>`);
			}

			if ((setting('show-permissions') == 'true' || (setting('show-permissions') == 'mej' && sheet.enhancedjournal)) &&
				game.user.isGM &&
				(page.ownership.default >= 0 || Object.keys(page.ownership).length > 1)) {

				let permissions = $(`.pages-list li[data-page-id="${page._id}"] .page-heading .page-ownership`, html);
				if (!permissions.length)
					permissions = $("<span>").addClass("page-ownership").appendTo($(`.pages-list li[data-page-id="${page._id}"] .page-heading`, html));
				permissions.empty();

				if (page.ownership.default >= 0) {
					const [ownership] = levels.find(([, level]) => level === page.ownership.default);
					permissions.append($('<i>').addClass(page.ownership.default == 0 ? 'fas fa-users-slash' : 'fas fa-users').attr('title', `${i18n("MonksEnhancedJournal.Everyone")}: ${i18n(`OWNERSHIP.${ownership}`)}`));
				}
				for (let [key, value] of Object.entries(page.ownership)) {
					let user = game.users.find(u => {
						return u.id == key && !u.isGM;
					});
					if (user != undefined && value > 0 && value != page.ownership.default) {
						const [ownership] = levels.find(([, level]) => level === value);
						permissions.append($('<div>').css({ backgroundColor: user.color }).html(user.name[0]).attr('title', user.name + ': ' + i18n(`OWNERSHIP.${ownership}`)));
					}
				}
			}
		}
	}
});
*/

Hooks.on("renderJournalEntryPageImageSheet", (sheet, html, data) => {
	let div = $('<div>').addClass("no-file-notification").toggle(data.document.src == undefined).html(`<i class="fas ${data.document.type == "video" ? 'fa-video-slash' : 'fa-image-slash'}"></i> No ${data.document.type}`).appendTo($(".journal-page-content,.image-preview", html));
	if (data.document.type == "image" && data.document.src == undefined) $('img', html).hide();
	$('img', html).on("error", () => {
		div.show();
		$('img', html).hide();
	});
});

Hooks.on("renderJournalEntryPageVideoSheet", (sheet, html, data) => {
	if (!sheet.isEditable) {
		let div = $('<div>').addClass("no-file-notification").toggle(data.document.src == undefined).html(`<i class="fas ${data.document.type == "video" ? 'fa-video-slash' : 'fa-image-slash'}"></i> No ${data.document.type}`).appendTo($(".journal-page-content,.video-preview", html));
		if (data.document.type == "image" && data.document.src == undefined) $('img', html).hide();
		$('video', html).on("error", () => {
			div.show();
			$('video', html).hide();
		});
	}
});

Hooks.on("renderJournalEntryPageHandlebarsSheet", (sheet, html, data) => {
	//$("a.inline-request-roll", html).click(MonksEnhancedJournal._onClickInlineRequestRoll.bind(sheet));
	$("a.picture-link", html).click(MonksEnhancedJournal._onClickPictureLink.bind(sheet));

	$("<div>")
		.addClass("view-as-appendix noflex")
		.append($("<label>")
			.addClass("checkbox")
			.append($("<span>").html("View as Appendix"))
			.append($("<input>")
				.attr("type", "checkbox")
				.attr("name", "flags.monks-enhanced-journal.appendix")
				.prop("checked", sheet.document.getFlag("monks-enhanced-journal", "appendix"))
				.on("click", async (ev) => {
					$(".show-title input", html).prop("checked", !$(ev.currentTarget).prop("checked"));
				})
			)
		)
		.insertAfter($(".show-title", html));

	$(".show-title input", html).on("click", (ev) => {
        $("input[name='flags.monks-enhanced-journal.appendix']", html).prop("checked", !$(ev.currentTarget).prop("checked"));
	});
});

Hooks.on("renderCompendium", async (app, html, data) => {
	if (app.collection.documentName == "JournalEntry") {
		let types = MonksEnhancedJournal.getDocumentTypes();
		await app.collection.getIndex({ fields: ["img", "flags.monks-enhanced-journal"] });
		for (let index of app.collection.index) {
			let img = $(`li[data-document-id="${index._id}"] > img.thumbnail`, html);
			let pagetype = foundry.utils.getProperty(index, "flags.monks-enhanced-journal.pagetype");
			let imgFile = index.img || foundry.utils.getProperty(index, "flags.monks-enhanced-journal.img") || (pagetype && types[pagetype] != undefined ? `modules/monks-enhanced-journal/assets/${pagetype}.png` : "icons/svg/book.svg");
			if (img.length) {
				img.attr("src", imgFile)
			} else {
				$(`li[data-document-id="${index._id}"]`, html).prepend($("<img>").addClass("thumbnail").attr("title", index.name).attr("alt", index.name).attr("src", imgFile));
			}
		}
	}
});

Hooks.on('updateWorldTime', async (worldTime) => {
	if (game.user.isGM) {
		let currentWorldTime = worldTime + MonksEnhancedJournal.TimeOffset;
		let dayTime = Math.abs(Math.trunc((currentWorldTime % 86400) / 60));
		if (currentWorldTime < 0) dayTime = 1440 - dayTime;

		for (let journal of game.journal) {
			if (MonksEnhancedJournal.getMEJType(journal) == "shop") {
				let shop = journal.pages.contents[0];

				let state = foundry.utils.getProperty(shop, "flags.monks-enhanced-journal.state");
				let newstate = MonksEnhancedJournal.getOpenState(shop);
				if (state != newstate) {
					await shop.setFlag("monks-enhanced-journal", "state", newstate);
				}
			}
		}
	}
});

Hooks.on("setupTileActions", (app) => {
	app.registerTileGroup('monks-enhanced-journal', i18n("MonksEnhancedJournal.AppName"));
	app.registerTileAction('monks-enhanced-journal', 'completequest', {
		name: i18n("MonksEnhancedJournal.ChangeQuestStatus"),
		ctrls: [
			{
				id: "entity",
				name: i18n("MonksEnhancedJournal.SelectEntity"),
				type: "select",
				subtype: "entity",
				options: { show: ['previous'] },
				restrict: (entity) => { return (entity instanceof JournalEntry); },
				required: true,
				defaultType: 'journal',
				placeholder: i18n("MonksEnhancedJournal.msg.PleaseSelectJournal")
			},
			{
				id: "status",
				name: i18n("MonksEnhancedJournal.Status"),
				list: "status",
				type: "list"
			}
		],
		group: 'monks-enhanced-journal',
		values: {
			'status': {
				"inactive": "MonksEnhancedJournal.queststatus.unavailable",
				"available": "MonksEnhancedJournal.queststatus.available",
				"inprogress": "MonksEnhancedJournal.queststatus.inprogress",
				"completed": "MonksEnhancedJournal.queststatus.completed",
				"failed": "MonksEnhancedJournal.queststatus.failed"
			}
		},
		fn: async (args = {}) => {
			const { action } = args;

			let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
			for (let entity of entities) {
				if (entity instanceof JournalEntry)
					entity = entity.pages.contents[0];
				await entity.setFlag("monks-enhanced-journal", "status", action.data.status);
			}
		},
		content: async (trigger, action) => {
			let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
			return `<span class="action-style">${i18n(trigger.name)}</span> of <span class="entity-style">${entityName}</span> to <span class="details-style">"${i18n(trigger.values.status[action.data?.status])}"</span>`;
		}
	});
	app.registerTileAction('monks-enhanced-journal', 'startencounter', {
		name: i18n("MonksEnhancedJournal.StartEncounter"),
		ctrls: [
			{
				id: "entity",
				name: i18n("MonksEnhancedJournal.SelectEntity"),
				type: "select",
				subtype: "entity",
				options: { show: ['previous'] },
				restrict: (entity) => { return (entity instanceof JournalEntry); },
				required: true,
				defaultType: 'journal',
				placeholder: "MonksEnhancedJournal.msg.PleaseSelectJournal"
			},
			{
				id: "location",
				name: i18n("MonksEnhancedJournal.SelectCoordinates"),
				type: "select",
				subtype: "either",
				options: { show: ['tagger', 'previous'] },
				restrict: (entity) => { return (entity instanceof Tile && this.scene.id == entity.parent.id) || this.scene.id == entity.id; },
				required: true
			},
			{
				id: "startcombat",
				name: i18n("MonksEnhancedJournal.StartCombat"),
				type: "checkbox"
			}
		],
		group: 'monks-enhanced-journal',
		fn: async (args = {}) => {
			const { tile, action, value } = args;

			let dests = await game.MonksActiveTiles.getLocation.call(tile, action.data.location, args);
			dests = (dests instanceof Array ? dests : [dests]);

			if (!dests.length)
				return;

			dests = dests.map(d => {
				if (d instanceof TileDocument) {
					return { x: d.x, y: d.y, distance: Math.min(d.width, d.height), t: 'rect' };
				} else {
					return { x: d.x, y: d.y, distance: 20, center: true };
				}
			});

			let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
			for (let entity of entities) {
				if (entity instanceof JournalEntry && entity.pages.size == 1) {
					entity = entity.pages.contents[0];
				}
				MonksEnhancedJournal.fixType(entity);
				const cls = (entity._getSheetClass ? entity._getSheetClass() : null);
				if (cls && cls.createEncounter) {
					cls.createEncounter.call(entity, dests, { combat: action.data.startcombat });
				}
			}
		},
		content: async (trigger, action) => {
			let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
			return `<span class="action-style">${i18n(trigger.name)}</span> of <span class="entity-style">${entityName}</span> ${(action.data.startcombat ? ' <i class="fas fa-fist-raised" data-tooltip="Start Combat"></i>' : '')}`;
		}
	});
	app.registerTileAction('monks-enhanced-journal', 'selectencounter', {
		name: i18n("MonksEnhancedJournal.SelectEncounter"),
		ctrls: [
			{
				id: "entity",
				name: i18n("MonksEnhancedJournal.SelectEntity"),
				type: "select",
				subtype: "entity",
				options: { show: ['previous'] },
				restrict: (entity) => { return (entity instanceof JournalEntry); },
				required: true,
				defaultType: 'journal',
				placeholder: "MonksEnhancedJournal.msg.PleaseSelectJournal"
			}
		],
		group: 'monks-enhanced-journal',
		fn: async (args = {}) => {
			const { action } = args;

			let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
			for (let entity of entities) {
				if (entity instanceof JournalEntry && entity.pages.size == 1) {
					entity = entity.pages.contents[0];
				}
				MonksEnhancedJournal.fixType(entity);
				const cls = (entity._getSheetClass ? entity._getSheetClass() : null);
				if (cls && cls.selectEncounter) {
					cls.selectEncounter.call(entity);
				}
			}
		},
		content: async (trigger, action) => {
			let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
			return `<span class="action-style">${i18n(trigger.name)}</span> of <span class="entity-style">${entityName}</span>`;
		}
	});
	app.registerTileAction('monks-enhanced-journal', 'append', {
		name: "Write to Journal",
		requiresGM: true,
		visible: false,
		ctrls: [
			{
				id: "entity",
				name: "MonksEnhancedJournal.SelectEntity",
				type: "select",
				subtype: "entity",
				options: { show: ['previous', 'players'] },
				restrict: (entity) => { return (entity instanceof JournalEntry); },
				required: true,
				defaultType: 'journal',
				placeholder: 'Please select a Journal',
				onChange: async (app, ctrl, action, data) => {
					$('select[name="data.page"]', app.element).empty();
					let value = $(ctrl).val();
					if (!!value) {
						try {
							let entityVal = JSON.parse(value);

							let pageCtrl = action.ctrls.find(c => c.id == "page");
							let list = await pageCtrl.list(app, action, { entity: entityVal });
							$('select[name="data.page"]', app.element).append(app.fillList(list, data.page));
						} catch { }
					}
				}
			},
			{
				id: "page",
				name: "Page",
				placeholder: 'Please select a Journal Page',
				list: async (app, action, data) => {
					let value = data.entity?.id;
					if (!!value) {
						try {
							// make sure it's not an enhanced journal, those shouldn't reveal their pages
							if (/^JournalEntry.[a-zA-Z0-9]{16}$/.test(value)) {
								let entity = await fromUuid(value);

								if (entity && !(entity.pages.size == 1 && !!foundry.utils.getProperty(entity.pages.contents[0], "flags.monks-enhanced-journal.type"))) {
									let list = { "": "" };
									for (let p of entity.pages)
										list[p._id] = p.name;

									return list;
								}
							}
						} catch { }
					}
				},
				type: "list",
				required: false
			},
			{
				id: "create",
				name: "Create page if not found",
				type: "checkbox",
				defvalue: false,
				onClick: (app) => {
					app.checkConditional();
				}
			},
			{
				id: "createname",
				name: "New Page name",
				type: "text",
				required: false,
				conditional: (app) => {
					return $('input[name="data.create"]', app.element).prop('checked');
				}
			},
			{
				id: "text",
				name: "Text",
				type: "text",
				subtype: "multiline",
				required: true
			},
			{
				id: "append",
				name: "Write",
				list: "append-type",
				type: "list",
				required: true,
				defvalue: "append"
			}
		],
		values: {
			'append-type': {
				'append': "Append",
				'prepend': "Prepend",
				'overwrite': "Overwrite",
			}
		},
		group: 'monks-enhanced-journal',
		fn: async (args = {}) => {
			const { tile, tokens, action, userid, value, method, change } = args;

			let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
			for (let entity of entities) {
				if (entity instanceof JournalEntry && entity.pages.size > 0) {
					let context = {
						actor: tokens[0]?.actor?.toObject(false),
						token: tokens[0]?.toObject(false),
						tile: tile.toObject(false),
						entity: entity,
						user: game.users.get(userid),
						value: value,
						scene: canvas.scene,
						method: method,
						change: change,
						timestamp: new Date().toLocaleString()
					};

					let page = (action.data.page ? entity.pages.get(action.data.page) : null);
					if (!page) {
						if (action.data.create) {
							let name = action.data.createname || "";
							if (name.includes("{{")) {
								const compiled = Handlebars.compile(name);
								name = compiled(context, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }).trim();
							}
							page = await JournalEntryPage.create({ type: "text", name: name }, { parent: entity });
						} else if (entity.pages.contents.length)
							page = entity.pages.contents[0];
					}

					if (!page)
						continue;

					let text = action.data.text;
					if (text.includes("{{")) {
						const compiled = Handlebars.compile(text);
						text = compiled(context, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }).trim();
					}

					let content = page.text.content || "";
					if (action.data.append == "append")
						content = content + text;
					else if (action.data.append == "prepend")
						content = text + content;
					else if (action.data.append == "overwrite")
						content = text;

					await page.update({ text: { content: content } });
				}
			}
		},
		content: async (trigger, action) => {
			let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
			return `<span class="action-style">${i18n(trigger.name)}</span>, <span class="entity-style">${entityName}</span>`;
		}
	});
});
