import { MonksEnhancedJournal, i18n } from "./monks-enhanced-journal.js"
import { EditCurrency } from "./apps/editcurrency.js"
import { AdjustPrice } from "./apps/adjust-price.js"
import { EditPersonAttributes, EditPlaceAttributes } from "./apps/editattributes.js"
import { CustomisePages } from "./apps/customise-pages.js"
import { APSJ } from "./apsjournal.js";

export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-enhanced-journal";

	let rollingmodules = {
		'monks-tokenbar': "Monk's TokenBar"
	};

	let permissions = {
		'true': "Sidebar and Enhanced Journal",
		'mej': "Just Enhanced Journal",
		'false': "Neither"
	};

	let inlineStyling = {
		'true': "Monk's Enhanced Journal",
		'apsj': "Arius Planeswalker's Stylish Journal",
		'false': "Core Foundry"
	};

	let engineOptions = {
		'tinymce': "TinyMCE",
        'prosemirror': "ProseMirror",
    };

	let backgroundImages = {
		'none': "None",
		'darkParchment': "Parchment - Dark",
		'parchment': "Parchment - Light",
		"marbleBlack": "Marble - Black",
		"marbleWhite": "Marble - White",
		"metalBrushed": "Metal - Brushed",
		"paperCotton": "Paper - Cotton",
		"paperCrumpled": "Paper - Crumpled",
		"paperCrumpledYellowed": "Paper - Crumpled Yellowed",
		"paperRecycled": "Paper - Recycled",
		"paperRice": "Paper - Rice",
		"solidBlack": "Solid - Black",
		"solidGrey": "Solid - Grey",
		"solidWhite": "Solid - White",
		"woodAlpine": "Wood - Alpine",
		"woodPine": "Wood - Pine"
	};

	let sidebarImages = {
		'none': "None",
		"granite": "Granite",
		"marbleBlack": "Marble - Black",
		"marbleWhite": "Marble - White",
		"metalBrushed": "Metal - Brushed",
		"metalGalvanized": "Metal - Galvanized",
		'darkParchment': "Parchment - Dark",
		'parchment': "Parchment - Light",
		'darkLeather': "Leather - Dark",
		'leather': "Leather - Light",
		"solidBlack": "Solid - Black",
		"solidGrey": "Solid - Grey",
		"solidWhite": "Solid - White",
		"woodAlpine": "Wood - Alpine",
		"woodCottagePine": "Wood - Cottage Pine",
		"woodPine": "Wood - Pine",
	};

	let backgroundColour = {
		'none': "None",
		'clear': "Clear",
		'black': 'Black',
		'red': "Red",
		'orange': "Orange",
		'yellow': "Yellow",
		'green': "Green",
		'cyan': "Cyan",
		'blue': "Blue",
		'purple': "Purple"
	};

	let lootsheetoptions = MonksEnhancedJournal.getLootSheetOptions();
	let lootfolder = {};

	game.settings.registerMenu(modulename, 'editCurrency', {
		label: i18n("MonksEnhancedJournal.editcurrency.name"),
		hint: i18n("MonksEnhancedJournal.editcurrency.hint"),
		icon: 'fas fa-coins',
		restricted: true,
		type: EditCurrency
	});

	game.settings.registerMenu(modulename, 'customise-pages', {
		label: i18n("MonksEnhancedJournal.customise-pages.name"),
		hint: i18n("MonksEnhancedJournal.customise-pages.hint"),
		icon: 'fas fa-file-lines',
		restricted: true,
		type: CustomisePages
	});

	game.settings.register(modulename, 'editor-engine', {
		name: i18n("MonksEnhancedJournal.editor-engine.name"),
		hint: i18n("MonksEnhancedJournal.editor-engine.hint"),
		scope: 'world',
		config: true,
		default: "tinymce",
		choices: engineOptions,
		type: String,
	});

	game.settings.register(modulename, 'background-colour', {
		name: i18n('APSJournal.background-colour.name'),
		hint: i18n('APSJournal.background-colour.hint'),
		scope: 'client',
		config: true,
		default: "none",
		choices: backgroundColour,
		type: String,
		onChange: (value) => {
			APSJ.setTheme(value);
		},
	});

	game.settings.register(modulename, 'background-image', {
		name: i18n('APSJournal.background-image.name'),
		hint: i18n('APSJournal.background-image.hint'),
		scope: 'client',
		config: true,
		default: "none",
		choices: backgroundImages,
		type: String,
		onChange: (value) => {
			$('#MonksEnhancedJournal').attr("background-image", value);
		},
	});

	game.settings.register(modulename, 'sidebar-image', {
		name: i18n('APSJournal.sidebar-image.name'),
		hint: i18n('APSJournal.sidebar-image.hint'),
		scope: 'client',
		config: true,
		default: "none",
		choices: sidebarImages,
		type: String,
		onChange: (value) => {
			$('#MonksEnhancedJournal').attr("sidebar-image", value);
		},
	});

	game.settings.register(modulename, "allow-player", {
		name: i18n("MonksEnhancedJournal.allow-player.name"),
		hint: i18n("MonksEnhancedJournal.allow-player.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "open-new-tab", {
		name: i18n("MonksEnhancedJournal.open-new-tab.name"),
		hint: i18n("MonksEnhancedJournal.open-new-tab.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "rolling-module", {
		name: i18n("MonksEnhancedJournal.rolling-module.name"),
		hint: i18n("MonksEnhancedJournal.rolling-module.hint"),
		scope: "world",
		default: null,
		type: String,
		choices: rollingmodules,
		config: true
	});

	game.settings.register(modulename, "use-objectives", {
		name: i18n("MonksEnhancedJournal.use-objectives.name"),
		hint: i18n("MonksEnhancedJournal.use-objectives.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "show-objectives", {
		name: i18n("MonksEnhancedJournal.show-objectives.name"),
		hint: i18n("MonksEnhancedJournal.show-objectives.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "objectives-always", {
		name: i18n("MonksEnhancedJournal.objectives-always.name"),
		hint: i18n("MonksEnhancedJournal.objectives-always.hint"),
		scope: "client",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "add-create-link", {
		name: i18n("MonksEnhancedJournal.add-create-link.name"),
		hint: i18n("MonksEnhancedJournal.add-create-link.hint"),
		scope: "world",
		default: false,
		type: Boolean,
		requiresReload: true
	});

	game.settings.register(modulename, "use-runes", {
		name: i18n("MonksEnhancedJournal.use-runes.name"),
		hint: i18n("MonksEnhancedJournal.use-runes.hint"),
		scope: "world",
		config: game.modules.get("polyglot")?.active,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "show-permissions", {
		name: i18n("MonksEnhancedJournal.show-permissions.name"),
		hint: i18n("MonksEnhancedJournal.show-permissions.hint"),
		scope: "world",
		config: true,
		default: 'true',
		type: String,
		choices: permissions,
	});

	game.settings.register(modulename, "show-chatbubble", {
		name: i18n("MonksEnhancedJournal.show-chatbubble.name"),
		hint: i18n("MonksEnhancedJournal.show-chatbubble.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "inline-roll-styling", {
		name: i18n("MonksEnhancedJournal.inline-roll-styling.name"),
		hint: i18n("MonksEnhancedJournal.inline-roll-styling.hint"),
		scope: "world",
		config: true,
		default: "true",
		type: String,
		choices: inlineStyling,
		onChange: (value) => {
			$('body').attr("inline-roll-styling", value);
		},
	});

	game.settings.register(modulename, "hud-limited", {
		name: i18n("MonksEnhancedJournal.hud-limited.name"),
		hint: i18n("MonksEnhancedJournal.hud-limited.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "start-collapsed", {
		name: i18n("MonksEnhancedJournal.start-collapsed.name"),
		hint: i18n("MonksEnhancedJournal.start-collapsed.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "start-toc-collapsed", {
		name: i18n("MonksEnhancedJournal.start-toc-collapsed.name"),
		hint: i18n("MonksEnhancedJournal.start-toc-collapsed.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "open-outside", {
		name: i18n("MonksEnhancedJournal.open-outside.name"),
		hint: i18n("MonksEnhancedJournal.open-outside.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "show-folder-sort", {
		name: i18n("MonksEnhancedJournal.show-folder-sort.name"),
		hint: i18n("MonksEnhancedJournal.show-folder-sort.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: (value) => {
			ui.journal.render();
		},
	});

	game.settings.register(modulename, "show-zero-quantity", {
		name: i18n("MonksEnhancedJournal.show-zero-quantity.name"),
		hint: i18n("MonksEnhancedJournal.show-zero-quantity.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "loot-inactive-players", {
		name: i18n("MonksEnhancedJournal.loot-inactive-players.name"),
		hint: i18n("MonksEnhancedJournal.loot-inactive-players.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "loot-auto-distribute", {
		name: i18n("MonksEnhancedJournal.loot-auto-distribute.name"),
		hint: i18n("MonksEnhancedJournal.loot-auto-distribute.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "chat-message", {
		name: i18n("MonksEnhancedJournal.chat-message.name"),
		hint: i18n("MonksEnhancedJournal.chat-message.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "hide-inline", {
		name: i18n("MonksEnhancedJournal.hide-inline.name"),
		hint: i18n("MonksEnhancedJournal.hide-inline.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "hide-rolltables", {
		name: i18n("MonksEnhancedJournal.hide-rolltables.name"),
		hint: i18n("MonksEnhancedJournal.hide-rolltables.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "show-bookmarkbar", {
		name: i18n("MonksEnhancedJournal.show-bookmarkbar.name"),
		hint: i18n("MonksEnhancedJournal.show-bookmarkbar.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "show-menubar", {
		name: i18n("MonksEnhancedJournal.show-menubar.name"),
		hint: i18n("MonksEnhancedJournal.show-menubar.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "hide-rolltables", {
		name: i18n("MonksEnhancedJournal.hide-rolltables.name"),
		hint: i18n("MonksEnhancedJournal.hide-rolltables.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "use-system-tag", {
		name: i18n("MonksEnhancedJournal.use-system-tag.name"),
		hint: i18n("MonksEnhancedJournal.use-system-tag.hint"),
		scope: "world",
		config: true,
		default: game.system.id == "pf2e",
		type: Boolean,
	});

	game.settings.register(modulename, "extract-extra-classes", {
		name: i18n("MonksEnhancedJournal.extract-extra-classes.name"),
		hint: i18n("MonksEnhancedJournal.extract-extra-classes.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "distribute-conversion", {
		name: i18n("MonksEnhancedJournal.distribute-conversion.name"),
		hint: i18n("MonksEnhancedJournal.distribute-conversion.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "purchase-conversion", {
		name: i18n("MonksEnhancedJournal.purchase-conversion.name"),
		hint: i18n("MonksEnhancedJournal.purchase-conversion.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "use-generic-price", {
		name: i18n("MonksEnhancedJournal.use-generic-price.name"),
		hint: i18n("MonksEnhancedJournal.use-generic-price.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "loot-sheet", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-sheet.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-sheet.hint"),
		scope: "world",
		config: true,
		default: "monks-enhanced-journal",
		choices: lootsheetoptions,
		type: String,
	});
	game.settings.register(modulename, "loot-entity", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-entity.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-entity.hint"),
		scope: "world",
		config: true,
		default: "",
		type: String,
	});
	game.settings.register(modulename, "loot-folder", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-folder.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-folder.hint"),
		scope: "world",
		config: false,
		default: "",
		choices: lootfolder,
		type: String,
	});
	game.settings.register(modulename, "loot-name", {
		name: i18n("MonksEnhancedJournal.loot-name.name"),
		hint: i18n("MonksEnhancedJournal.loot-name.hint"),
		scope: "world",
		config: true,
		default: i18n("MonksEnhancedJournal.LootEntry"),
		type: String,
	});
	game.settings.register(modulename, "party-loot-entity", {
		name: game.i18n.localize("MonksEnhancedJournal.party-loot-entity.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.party-loot-entity.hint"),
		scope: "world",
		config: false,
		default: "",
		type: String,
	});

	game.settings.register(modulename, "currency", {
		scope: "world",
		config: false,
		default: [],
		type: Array,
	});

	game.settings.register(modulename, "sheet-settings", {
		scope: "world",
		config: false,
		default: {
			list: {

			},
			encounter: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'monsters': { name: 'MonksEnhancedJournal.Monsters', shown: true },
					'loot': { name: 'MonksEnhancedJournal.Loot', shown: true },
					'dcs': { name: 'MonksEnhancedJournal.DCs', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				}
			},
			event: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
			},
			organization: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'offerings': { name: 'MonksEnhancedJournal.Offerings', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
			},
			person: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'entry-details': { name: 'MonksEnhancedJournal.Details', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'offerings': { name: 'MonksEnhancedJournal.Offerings', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
				attributes: {
					'race': { name: "MonksEnhancedJournal.Race", order: 0, shown: false, full: false },
					'ancestry': { name: "MonksEnhancedJournal.Ancestry", order: 1, shown: true, full: false },
					'gender': { name: "MonksEnhancedJournal.Gender", order: 2, shown: false, full: false },
					'age': { name: "MonksEnhancedJournal.Age", order: 3, shown: true, full: false },
					'eyes': { name: "MonksEnhancedJournal.Eyes", order: 4, shown: true, full: false },
					'skin': { name: "MonksEnhancedJournal.Skin", order: 5, shown: false, full: false },
					'hair': { name: "MonksEnhancedJournal.Hair", order: 6, shown: true, full: false },
					'life': { name: "MonksEnhancedJournal.LifeStatus", order: 7, shown: false, full: false },
					'profession': { name: "MonksEnhancedJournal.Profession", order: 8, shown: false, full: false },
					'pronoun': { name: "MonksEnhancedJournal.Pronoun", order: 9, shown: false, full: false },
					'voice': { name: "MonksEnhancedJournal.Voice", order: 10, shown: true, full: false },
					'faction': { name: "MonksEnhancedJournal.Faction", order: 11, shown: false, full: false },
					'height': { name: "MonksEnhancedJournal.Height", order: 12, shown: false, full: false },
					'weight': { name: "MonksEnhancedJournal.Weight", order: 13, shown: false, full: false },
					'traits': { name: "MonksEnhancedJournal.Traits", order: 14, shown: true, full: false },
					'ideals': { name: "MonksEnhancedJournal.Ideals", order: 15, shown: true, full: true },
					'bonds': { name: "MonksEnhancedJournal.Bonds", order: 16, shown: true, full: true },
					'flaws': { name: "MonksEnhancedJournal.Flaws", order: 17, shown: true, full: true },
					'longterm': { name: "MonksEnhancedJournal.LongTermGoal", order: 18, shown: false, full: true },
					'shortterm': { name: "MonksEnhancedJournal.ShortTermGoal", order: 19, shown: false, full: true },
					'beliefs': { name: "MonksEnhancedJournal.Beliefs", order: 20, shown: false, full: true },
					'secret': { name: "MonksEnhancedJournal.Secret", order: 21, shown: false, full: true }
				}
			},
			place: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'entry-details': { name: 'MonksEnhancedJournal.Details', shown: true },
					'townsfolk': { name: 'MonksEnhancedJournal.Townsfolk', shown: true },
					'shops': { name: 'MonksEnhancedJournal.Shops', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
				attributes: {
					'age': { name: "MonksEnhancedJournal.Age", order: 0, shown: true, full: false },
					'size': { name: "MonksEnhancedJournal.Size", order: 1, shown: true, full: false },
					'government': { name: "MonksEnhancedJournal.Government", order: 2, shown: true, full: false },
					'alignment': { name: "MonksEnhancedJournal.Alignment", order: 3, shown: false, full: false },
					'faction': { name: "MonksEnhancedJournal.Faction", order: 4, shown: false, full: false },
					'inhabitants': { name: "MonksEnhancedJournal.Inhabitants", order: 5, shown: true, full: true },
					'districts': { name: "MonksEnhancedJournal.Districts", order: 6, shown: false, full: true },
					'agricultural': { name: "MonksEnhancedJournal.Agricultural", order: 7, shown: false, full: true },
					'cultural': { name: "MonksEnhancedJournal.Cultural", order: 8, shown: false, full: true },
					'educational': { name: "MonksEnhancedJournal.Educational", order: 9, shown: false, full: true },
					'indistrial': { name: "MonksEnhancedJournal.Industrial", order: 10, shown: false, full: true },
					'mercantile': { name: "MonksEnhancedJournal.Mercantile", order: 11, shown: false, full: true },
					'military': { name: "MonksEnhancedJournal.Military", order: 12, shown: false, full: true }
				}
			},
			poi: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
			},
			picture: {
				settings: {
					'open': { name: 'MonksEnhancedJournal.OpenAsPicture', value: false },
				}
			},
			quest: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'objectives': { name: 'MonksEnhancedJournal.Objectives', shown: true },
					'rewards': { name: 'MonksEnhancedJournal.Rewards', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
			},
			shop: {
				tabs: {
					'description': { name: 'MonksEnhancedJournal.Description', shown: true },
					'entry-details': { name: 'MonksEnhancedJournal.Details', shown: true },
					'items': { name: 'MonksEnhancedJournal.Loot', shown: true },
					'relationships': { name: 'MonksEnhancedJournal.Relationships', shown: true },
					'notes': { name: 'MonksEnhancedJournal.Notes', shown: true },
				},
				adjustment: {
					default: {
						name: "",
						sell: 1,
						buy: 0.5
					}
				}
			}
		},
		type: Object,
	});

	game.settings.register(modulename, "person-attributes", {
		scope: "world",
		config: false,
		default: [
			{ id: 'race', name: "MonksEnhancedJournal.Race", hidden: true, full: false },
			{ id: 'ancestry', name: "MonksEnhancedJournal.Ancestry", hidden: false, full: false },
			{ id: 'gender', name: "MonksEnhancedJournal.Gender", hidden: true, full: false },
			{ id: 'age', name: "MonksEnhancedJournal.Age", hidden: false, full: false },
			{ id: 'eyes', name: "MonksEnhancedJournal.Eyes", hidden: false, full: false },
			{ id: 'skin', name: "MonksEnhancedJournal.Skin", hidden: true, full: false },
			{ id: 'hair', name: "MonksEnhancedJournal.Hair", hidden: false, full: false },
			{ id: 'life', name: "MonksEnhancedJournal.LifeStatus", hidden: true, full: false },
			{ id: 'profession', name: "MonksEnhancedJournal.Profession", hidden: true, full: false },
			{ id: 'pronoun', name: "MonksEnhancedJournal.Pronoun", hidden: true, full: false },
			{ id: 'voice', name: "MonksEnhancedJournal.Voice", hidden: false, full: false },
			{ id: 'faction', name: "MonksEnhancedJournal.Faction", hidden: true, full: false },
			{ id: 'height', name: "MonksEnhancedJournal.Height", hidden: true, full: false },
			{ id: 'weight', name: "MonksEnhancedJournal.Weight", hidden: true, full: false },
			{ id: 'traits', name: "MonksEnhancedJournal.Traits", hidden: false, full: false },
			{ id: 'ideals', name: "MonksEnhancedJournal.Ideals", hidden: false, full: true },
			{ id: 'bonds', name: "MonksEnhancedJournal.Bonds", hidden: false, full: true },
			{ id: 'flaws', name: "MonksEnhancedJournal.Flaws", hidden: false, full: true },
			{ id: 'longterm', name: "MonksEnhancedJournal.LongTermGoal", hidden: true, full: true },
			{ id: 'shortterm', name: "MonksEnhancedJournal.ShortTermGoal", hidden: true, full: true },
			{ id: 'beliefs', name: "MonksEnhancedJournal.Beliefs", hidden: true, full: true },
			{ id: 'secret', name: "MonksEnhancedJournal.Secret", hidden: true, full: true }
		],
		type: Array,
	});

	game.settings.register(modulename, "place-attributes", {
		scope: "world",
		config: false,
		default: [
			{ id: 'age', name: "MonksEnhancedJournal.Age", hidden: false, full: false },
			{ id: 'size', name: "MonksEnhancedJournal.Size", hidden: false, full: false },
			{ id: 'government', name: "MonksEnhancedJournal.Government", hidden: false, full: false },
			{ id: 'alignment', name: "MonksEnhancedJournal.Alignment", hidden: true, full: false },
			{ id: 'faction', name: "MonksEnhancedJournal.Faction", hidden: true, full: false },
			{ id: 'inhabitants', name: "MonksEnhancedJournal.Inhabitants", hidden: false, full: true },
			{ id: 'districts', name: "MonksEnhancedJournal.Districts", hidden: true, full: true },
			{ id: 'agricultural', name: "MonksEnhancedJournal.Agricultural", hidden: true, full: true },
			{ id: 'cultural', name: "MonksEnhancedJournal.Cultural", hidden: true, full: true },
			{ id: 'educational', name: "MonksEnhancedJournal.Educational", hidden: true, full: true },
			{ id: 'indistrial', name: "MonksEnhancedJournal.Industrial", hidden: true, full: true },
			{ id: 'mercantile', name: "MonksEnhancedJournal.Mercantile", hidden: true, full: true },
			{ id: 'military', name: "MonksEnhancedJournal.Military", hidden: true, full: true }
		],
		type: Array,
	});

	game.settings.register(modulename, "adjustment-defaults", {
		scope: "world",
		config: false,
		default: {
			default: {
				sell: 1,
				buy: 0.5
			}
		},
		type: Object,
    });

	game.settings.register(modulename, "show-dialog", {
		scope: "client",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "show-chat-bubbles", {
		name: game.i18n.localize("MonksEnhancedJournal.show-chat-bubbles.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.show-chat-bubbles.hint"),
		scope: "client",
		default: false,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-relationships", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-journals", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-checklist", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-person", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-adjustment", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-sheet-settings", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});
}
