import {
    setting,
    i18n,
    log,
    makeid,
    MonksEnhancedJournal,
} from './monks-enhanced-journal.js';

export class APSJ {
    static blockList = [
        'black',
        'blue',
        'cyan',
        'green',
        'orange',
        'purple',
        'red',
        'yellow',
        'card',
        'scroll',
        'encounter',
        'read-aloud',
    ];
    static dialogList = [
        'blue',
        'cyan',
        'green',
        'orange',
        'purple',
        'red',
        'yellow',
    ];
    static panelList = [
        'bonus',
        'effect',
        'info',
        'loot',
        'note',
        'trap',
        'warning',
        'blue',
        'cyan',
        'green',
        'orange',
        'purple',
        'red',
        'yellow',
    ];

    static async init() {
        APSJ.setTheme(setting('background-colour'));
    }
        
    /**
     * Change to the selected theme in local storage
     **/
    static setTheme(theme) {
        if (theme == 'none')
            document.documentElement.removeAttribute('mejtheme');
        else
            document.documentElement.setAttribute('mejtheme', theme);
    }
    /**
     * Define HTML Elements for Blocks
     **/

    static async getBlock(colour) {
        if (['card', 'scroll', 'encounter', 'read-aloud'].includes(colour)) {
            let content = await foundry.applications.handlebars.renderTemplate(
                `modules/monks-enhanced-journal/templates/apsjournal/${colour}.html`
            );
            return content;
        } else {
            let data = {
                colour: colour,
                overlay: colour === 'black' ? 'light-overlay' : colour,
                header: i18n(`APSJournal.block-${colour}.heading`),
                body: i18n(`APSJournal.block-${colour}.body`),
            };

            let content = await foundry.applications.handlebars.renderTemplate(
                'modules/monks-enhanced-journal/templates/apsjournal/block.html',
                data
            );
            return content;
        }
    }

    static async getDialog(colour, side) {
        let content = await foundry.applications.handlebars.renderTemplate(
            'modules/monks-enhanced-journal/templates/apsjournal/dialog.html',
            { colour, side }
        );
        return content;
    }

    static async getPanel(colour) {
        let data = {
            heading: i18n(`APSJournal.panel-${colour}.heading`),
            icon: [
                'bonus',
                'effect',
                'info',
                'loot',
                'note',
                'trap',
                'warning',
            ].includes(colour),
        };

        switch (colour) {
            case 'bonus':
                data.colour = 'cyan';
                break;
            case 'effect':
                data.colour = 'purple';
                break;
            case 'info':
                data.colour = 'blue';
                break;
            case 'loot':
                data.colour = 'green';
                break;
            case 'note':
                data.colour = 'yellow';
                break;
            case 'trap':
                data.colour = 'orange';
                break;
            case 'warning':
                data.colour = 'red';
                break;
            default:
                data.colour = colour;
                break;
        }

        let content = await foundry.applications.handlebars.renderTemplate(
            'modules/monks-enhanced-journal/templates/apsjournal/panel.html',
            data
        );
        return content;
    }

    static addElement(htmlString) {
        const parser = ProseMirror.DOMParser.fromSchema(
            ProseMirror.defaultSchema
        );

        const node = ProseMirror.dom.parseString(htmlString);
        const state = this.view.state;
        const { $cursor } = state.selection;
        const tr = state.tr.insert($cursor.pos, node.content);
        const pos = $cursor.pos;// + node.nodeSize;

        tr.setSelection(ProseMirror.TextSelection.create(tr.doc, pos));
        this.view.dispatch(tr);
    }
    /*
    static getProseMirrorMenuDropDowns(items) {
        items.stylish = {
            cssClass: 'mej-menu-stylish',
            title: i18n('APSJournal.stylish-menu.name'),
            entries: [
                {
                    action: 'blocks',
                    title: 'Blocks',
                    children: APSJ.blockList.map((c) => {
                        return {
                            action: `${c}Block`,
                            title: i18n(`APSJournal.block-${c}.name`),
                            cmd: async () => {
                                APSJ.addElement.call(this, await APSJ.getBlock(c));
                            },
                        };
                    }),
                },
                {
                    action: 'dialogues',
                    title: 'Dialogues',
                    children: APSJ.dialogList.flatMap((c) => {
                        return ['left', 'right'].map((s) => {
                            return {
                                action: `${c}Dialogue${s}`,
                                title: i18n(`APSJournal.block-dialogue-${c}-${s}.name`),
                                cmd: async () => {
                                    APSJ.addElement.call(this, await APSJ.getDialog(c, s));
                                },
                            };
                        });
                    }),
                },
                {
                    action: 'panels',
                    title: 'Panels',
                    children: APSJ.panelList.map((c) => {
                        return {
                            action: `${c}Panel`,
                            title: i18n(`APSJournal.panel-${c}.name`),
                            cmd: async () => {
                                APSJ.addElement.call(this, await APSJ.getPanel(c));
                            },
                        };
                    }),
                },
            ],
        };
    }
    */
}
