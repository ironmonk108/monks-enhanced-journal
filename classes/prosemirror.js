import { log, setting, i18n, MonksEnhancedJournal } from '../monks-enhanced-journal.js';
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { APSJ } from "../apsjournal.js";
import { c as toggleMark, S as Schema } from '../../../scripts/vendor.mjs';

export class ProseMirrorPlugin {
	static getProseMirrorMenuDropDowns(menu, items) {
		if (menu.view.dom.closest('.monks-journal-sheet,.journal-sheet.journal-entry-page')) {
			//APSJ.getProseMirrorMenuDropDowns.call(menu, items);

			let font_sizes = [8, 10, 12, 14, 18, 24, 36, 48];

			let marks = {
				fontsize: {
					attrs: {
						fontsize: {}
					},
					inclusive: true,
					parseDOM: [{ tag: "span", getAttrs: dom => ({ fontsize: dom.style.fontSize }) }],
					toDOM: (mark) => {
						return ["span", { style: `font-size: ${mark.attrs.fontsize}px` }]
					}
				},
				mejreadaloud: {
					attrs: {},
					inclusive: true,
					parseDOM: [{ tag: "section" }],
					toDOM: () => {
						return ["section", { class: "readaloud" }]
					}
				}
			}

			let schema = new Schema({ nodes: menu.schema.spec.nodes, marks: menu.schema.spec.marks.append(marks) });
			menu.schema.marks.fontsize = schema.marks.fontsize;
			menu.schema.marks.mejreadaloud = schema.marks.mejreadaloud;

			items.fontsize = {
				cssClass: 'mej-menu-fontsize',
				title: "Font Size",
				entries: font_sizes.map((fontsize) => {
					return {
						action: `size${fontsize}`,
						title: `${fontsize}px`,
						style: `font-size: ${fontsize}px;line-height: ${Math.max(24, fontsize)}px`,
						mark: menu.schema.marks.fontsize,
						attrs: { fontsize },
						cmd: toggleMark(menu.schema.marks.fontsize, { fontsize })
					}
				}),
			};

			if (items?.format) {
				items.format.entries.push({
					action: "enhanced-journal",
					title: "Enhanced Journal",
					children: [
						{
							action: "read-aloud",
							title: "Read Aloud",
							attrs: { class: "readaloud" },
							node: menu.schema.nodes.paragraph,
							cmd: ProseMirrorPlugin._wrapReadAloud.bind(menu)
						},
						{
							action: "dropcap",
							title: "Drop Cap",
							style: `line-height: 3em`,
							mark: menu.schema.marks.span,
							attrs: { class: "drop-cap" },
							cmd: ProseMirror.commands.toggleMark(menu.schema.marks.span, {
								_preserve: {
									class: "drop-cap"
								}
							})
						}
					]
				});
			}

		}
	}

	static getProseMirrorMenuItems(menu, items) {
		if (menu.view.dom.closest('.monks-journal-sheet,.journal-sheet.journal-entry-page')) {
			const scopes = menu.constructor._MENU_ITEM_SCOPES;

			let marks = {
				color: {
					attrs: {
						color: {}
					},
					inclusive: true,
					parseDOM: [{ tag: "span", getAttrs: dom => ({ color: dom.style.color }) }],
					toDOM: (mark) => {
						return ["span", { style: `color: ${mark.attrs.color}` }]
					}
				}
			}

			let schema = new Schema({ nodes: menu.schema.spec.nodes, marks: menu.schema.spec.marks.append(marks) });
			menu.schema.marks.color = schema.marks.color;

			items.splice(5, 0, {
				action: "background-colour",
				title: "Change Background",
				icon: '<i class="fa-solid fa-brush fa-fw"></i>',
				scope: scopes.BOTH,
				priority: 10,
				cssClass: "mej-change-background",
				cmd: ProseMirrorPlugin._changeBackgroundPrompt.bind(menu)
			});

			items.splice(5, 0, {
				action: "text-colour",
				title: "Change Text Colour",
				icon: '<i class="fa-solid fa-paintbrush fa-fw"></i>',
				scope: scopes.BOTH,
				cssClass: "mej-change-text-colour",
				cmd: ProseMirrorPlugin._changeTextColourPrompt.bind(menu)
			});

			items.splice(8, 0, {
				action: "apsj-template",
				title: "Insert Stylish Template",
				icon: '<i class="fa-solid fa-envelopes-bulk fa-fw"></i>',
				scope: scopes.BOTH,
				cssClass: "mej-apsj-template",
				cmd: ProseMirrorPlugin._insertAPSJPrompt.bind(menu)
			});
		}
	}

	static async _insertAPSJPrompt() {
		let data = {
			templateOptions: {
				...APSJ.blockList.reduce((obj, c) => {
					obj[`block_${c}`] = i18n(`APSJournal.block-${c}.name`);
					return obj;
				}, {}),
				...APSJ.dialogList.reduce((obj, c) => {
					obj[`dialogue_${c}_left`] = i18n(`APSJournal.block-dialogue-${c}-left.name`);
					obj[`dialogue_${c}_right`] = i18n(`APSJournal.block-dialogue-${c}-right.name`);
					return obj;
				}, {}),
				...APSJ.panelList.reduce((obj, c) => {
					obj[`panel_${c}`] = i18n(`APSJournal.panel-${c}.name`);
					return obj;
				}, {})
			}
		};
		const dialog = await this._showDialog("apsj-template", "modules/monks-enhanced-journal/templates/prosemirror/apsj-template.html", { data });
		const form = dialog.querySelector("form");

		// Center the form in the middle of the screen
        form.classList.add("mej-centered-form");
		Object.assign(form.style, { top: `${(window.innerHeight / 2) - (form.offsetHeight / 2) }px`, left: `${(window.innerWidth / 2) - (form.offsetWidth / 2)}px` });

		form.elements.template.addEventListener("change", async () => {
			const templateId = form.elements.template.value;
			const idParts = templateId.split("_");

			let element = "";
			switch (idParts[0]) {
				case "block":
					element = await APSJ.getBlock(idParts[1]);
					break;
				case "dialogue":
					element = await APSJ.getDialog(idParts[1], idParts[2]);
					break;
				case "panel":
					element = await APSJ.getPanel(idParts[1]);
					break;
			}
			$(".apsj-preview", dialog).html(element);
		});
		let changeEvent = new Event('change');
        form.elements.template.dispatchEvent(changeEvent);
		form.elements.insert.addEventListener("click", async () => {
			const templateId = form.elements.template.value;
			const idParts = templateId.split("_");

			let element = "";
			switch (idParts[0]) {
				case "block":
					element = await APSJ.getBlock(idParts[1]);
					break;
				case "dialogue":
					element = await APSJ.getDialog(idParts[1], idParts[2]);
					break;
				case "panel":
					element = await APSJ.getPanel(idParts[1]);
					break;
			}

            APSJ.addElement.call(this, element);
			dialog.remove();
		});
		form.elements.cancel.addEventListener("click", () => {
			dialog.remove();
		});
	}

	static async _changeBackgroundPrompt() {
		const documentUuid = $(this.view.dom).closest("form").attr("entity-uuid");
		const document = documentUuid ? await fromUuid(documentUuid) : null;

		if (document == null)
			return;

		const documentData = document.getFlag('monks-enhanced-journal', 'style') || {};
		const data = {
			img: documentData.img?.value || documentData.img || "",
			color: documentData.color || "transparent",
			sizing: documentData.sizing || "repeat",
			sizingOptions: {
				repeat: "Repeat",
				cover: "Cover",
				contain: "Contain",
				stretch: "Stretch"
			}
		};

		const dialog = await this._showDialog("background-colour", "modules/monks-enhanced-journal/templates/prosemirror/background-colour.html", { data });
		const form = dialog.querySelector("form");
		form.elements.update.addEventListener("click", () => {
			let updateStyle = {
				img: form.elements.img.value || "",
				color: form.elements.color.value || "transparent",
				sizing: form.elements.sizing.value || "repeat"
			};
			document.setFlag('monks-enhanced-journal', 'style', updateStyle);
			EnhancedJournalSheet.updateStyle(updateStyle, $(this.view.dom.closest(".editor-parent")));
			dialog.remove();
		});
		form.elements.cancel.addEventListener("click", () => {
			dialog.remove();
		});
	}

	static async _changeTextColourPrompt() {
		const state = this.view.state;
		const { $from, $to, $cursor } = state.selection;

		let data = {
			color: window.getComputedStyle(this.view.dom).color || "#000000"
		}

		const mark = this.schema.marks.color;

		const links = [];
		state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
			if (node.marks.some(m => m.type === this.schema.marks.color)) links.push([node, pos]);
		});
		const existing = links.length === 1 && links[0];
		if (existing) {
			const [node] = existing;
			if ($cursor) data.text = node.text;
			// Pre-fill the dialog with the existing link's attributes.
			const link = node.marks.find(m => m.type === this.schema.marks.color);
			data.color = link.attrs.color || window.getComputedStyle(this.view.dom).color || "#000000";
		}

		const dialog = await this._showDialog("text-colour", "modules/monks-enhanced-journal/templates/prosemirror/text-colour.html", { data });
		const form = dialog.querySelector("form");
		const color = form.elements.color;
		form.elements.update.addEventListener("click", () => {
			if (!color.value) return;

			const link = this.schema.marks.color.create({ color: color.value });
			const tr = state.tr;

			if (existing && $cursor) {
				const [node, pos] = existing;
				const selection = TextSelection.create(state.doc, pos, pos + node.nodeSize);
				tr.setSelection(selection);
			}

            tr.addMark($from.pos, $to.pos, link);
			this.view.dispatch(tr);
			dialog.remove();
		});
		form.elements.cancel.addEventListener("click", () => {
			dialog.remove();
		});
	}

	static async _wrapReadAloud() {
		const state = this.view.state;
		let { $from, $to, $cursor } = state.selection;

		const range = $from.blockRange($to);
		if (range) {
			$from = range.start;
			$to = range.end;
		}
		const slice = state.doc.slice($from, $to);
		const section = this.schema.nodes.section.create({
			_preserve: {
				class: "readaloud"
			}
		}, slice.content);
		const tr = state.tr.replaceWith($from, $to, section);
		this.view.dispatch(tr);
	}
}

Hooks.on("getProseMirrorMenuDropDowns", ProseMirrorPlugin.getProseMirrorMenuDropDowns);
Hooks.on("getProseMirrorMenuItems", ProseMirrorPlugin.getProseMirrorMenuItems);