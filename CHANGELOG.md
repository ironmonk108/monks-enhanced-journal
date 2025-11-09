# Version 13.04

Fixing issue with Quest Rewards being shown to players even if visible is turned off

Fixing issue with Objectives being displayed even if available is turned off

Changed the text on the Objectives to be consistent

Removed buttons for players that players shouldn't been seen

# Version 13.03

Fixing Forge issue

# Version 13.02

Fixing upload issue

# Version 13.01

v13 compatibility

# Version 12.02

Fixing issues with unidentified items being revealed when purchased

Fixed issues with APS Journal templates listing in the drop down list

Fixing issues with slide transition naming collisions

Fixed issues with opening Scene Journal entry directing to the correct page

Fixed issues with dataModel conflicts

Fixed issue with displaying a hazard in MEJ

Fixed issues encountered in Burning Wheel system

Fixed issues with clamping the slideshow index

Added Im Progress to the list of statuses available when using MATT to set an Objective

Fixed issues when trying to save a Journal and trying to get Foundry to recognise the correct type of the Journal

Switched assigning items in a quest to ask which one to assign instead of using a flag

Fixed the slideshow to get a thumbnail from a video slide

# Version 12.01

v12 compatibility

Added the option to automatically distribute coins between players when opening the distribute dialog

# Version 11.11

Fixed link styling for the link list that appears when selecting the text that matches the name of a document.

Fixed issue with the new D&D 5e character sheet not saving a sheet type change.

Fixed issue where players were shown links to documents they weren't allowed to see.

Fixed issue with linking to a journal entry in the scene config

Fixed issue with unidentified names not being shown to players in loot and shop sheets.

Fixed issue with D&D 5e items not refreshing after changing the identified or equipped toggle.

Added the option to use [[/award]] in roll tables to populate loot and shop sheets.  Thank you NeilWhite

Also cleaned up the text option in roll tables to use {1d10gp} notation as well as {1d10 [gp]} notation.

# Version 11.10

Updated the objectives display to allow full resizing

Changed the available icon to make it clearer what it meant

Updated the error message when converting from a journal with multiple pages to a MEJ page that only needs one, to make it clearer that data is about to be deleted.

Fixed issues that the latest D&D5e updates introduced.

Fixed issue with changing the visiblity of a reward causing player to try and save the journal

Fixed issues with players not able to switch between rewards

Fixed issues that D&D 5e introduced when trying to edit items in Shops

Fixed issues that D&D 5e introduced when droppng an item on a Character sheet.

Fixed issue where updating a journal entry that a player had previously viewed was causing ti to open up again.

Fixed issue with saving items in a quest not finding the correct items to update

# Version 11.09

Fixed issue where the header buttons wouldn't refresh when changing between MEJ pages and Foundry pages.

Added support for using Prose Mirror editing in MEJ templates.

Fixed issue with the default page icon when exporting to compendium.

Fixed issues where notes were no longer editable

Added alternating shading for currency groups to better differentiate what name goes with what value.

# Version 11.08

Updated the page settings to allow for multiple setting options.

Added the option to customise what tabs are shown in general and on each page.

Added the option to open Picture sheets as Images rather than Journal Entries.

Fixed issue with DC Config when game system doesn't have a config setting

Added additional with to the currency editor dialog

Fixed issue when trying to remove a currency.

Removed controls associated with Open GM Note as they interfere with rendering the enhanced journal properly.

Fixing issues with re-ordering tabs causing an issue

Added options to the right click menu of tabs to close tabs other than the one clicked, and close all tabs to the right of the tab.

Fixed issue with dropping items on the Make Offering dialog.

Fixed scaling issues when displaying slide show slides.

Added the option to set colour, font, and size of text on slideshow slides

Added controls for editing and deleting text areas on slideshow slides, since the previous ways to edit and delete were confusing.

Added sound links to the links that are tracked by MEJ to be formatted.

Fixed item list issues with the GURPS system

Updated the Hotbar macro to display an image of the Journal Entry image when dragged onto the Hotbar.

Updated the Compendium view when dragging a Journal Entry into a Compendium it will attempt to use the image fromt he Journal Entry.

Added confirmation when trying to convert a Journal Entry that has more than one page.

Added context menu items when clicking on Journal Directory items to open in the Enhanced Browser or out of the Enhanced Browser, depending with the default settigns are.

Added context menu items when clicking on Journal Directory items to open in a new tab if setting is set to overwrite current tab.

Fixed issue with Foundry code when creating the Encounter Template on a gridless Scene.

Fixed issue with wall collisions when placing encounter tokens.

Fixed issue when updating a sale chat card information.

Sorting Journal entries appropriately when selecting a Journal Entry for the Note Dialog.

Added DnD 3.5 and DS4 currencies.

Defaulting the image correctly when creating a new Journal Entry.

Fixed issue finding the appropriate image to use when rendering a Compendium of Journal Entries.

Fixed issue with error message that players don't have permission to edit a Journal Entry when world time is changed.

Fixed issue in Encounter sheet when determining if the DCs tab can be shown.

Added the option to drag and drop multiple actors onto and Encounter using Multiple Document Selection module

Added the option to drag and drop multiple items using Multiple Document Selection module

Fixed issue when dragging and dropping a folder onto an Enhanced Journal entry.

Added check to make sure you're not dropping an actor that's already in the Encounter onto the Encounter.

Added sound effect quick link to the Editor toolbar.  So you can add sound links quickly.

Fixed issue with trying to edit, clear, and show a Journal Entry image.

Fixed issue with pirate borg currency

Fixed issue with List Journal Entry not respecting the folder an item is created in.

Fixed issue when creating a new List Journal Entry.

Fixed issue when adjusting the shop prices not accepting decimal values.

Fixed issue with the transfer currency dialog not translating strings properly.

Fixed issue with PF2e labeling of Perception

Fixed issue where the quest rewards entry was getting the context menu for the main tab bar

Added the option when purchasing an item from the shop to store the price as the original price rather than the price the player actually bought it for.  I'd highly recommend not using this as it can lead to a lot of strange economic issues where a player ends up being able to sell the item for more than they purchased it for.  Use at your own risk.

Fixed issue with clearing all items before filling with item from a Roll Table.

Fixed issue where Encounter loot that's just currency was not being added to a loot entity.

Fixed issue with copying text to chat, or splitting text to a new journal entry in Firefox.

Fixed List sheet search.

Fixed issue deleting rewards.

Fixed type in the placeholder text for Folder name when creating a new List Folder.

Fixed issue with NPC chat bubble selection clearing on opening a second time.

Fixed issue with the tooltip for saving the editor

Fixed various warning for using deprecated functions

# Version 11.05

Fixed issue with playing a slideshow when a scene loads.

Added the option to use a video file for a Slideshow slide.

Fixed issue with adding loot to an Encounter from a Journal Entry

Added the option to set sell and buy adjustments based on item type.

Added number display for progress list sheet.

Removed loading indication if error with slideshow image.

Cleared warning message with changes to Combat Details.

# Version 11.04

Fixed DC configuration in systems that don't have support for skills lists.

Added a setting to open the enhanced journal with the table of contents collapsed.

Fixed context menu option for opening outside the enhanced journal, when right clicking on a blank page.

Updated the Objective Display to include colour highlighting and icons.  And added sorting of objectives based on status.

Fixed padding of ownership indication of journal entries.

Added a slight background highlight to polyglot text.

Fixed issue with GURPS system and relationship list positioning.

Fixed issue with background while using Ernie's Modern UI.

Updated the Hotbar so that opening a Journal Entry link will open Enhanced Journal sheets properly.

Added code to ignore conflicts between Enhanced Journal and Multiple Document Selection.

Fixed issue that was clearing out all the saved setting of Journal Pages.

Fixed issue with refreshing the Object list when the permission of the Journal Entry changes.

Added additional compatibility with Polyglot.

Updated the notes tab to use an Editor rather than just a textarea.

Fixed issue where offerings from an actor that no longer existed were preventing the sheet fro loading.

Added In Progress back to the quest sheet.

# Version 11.03

Added Saving Throws to the DC Config for Encounters

Fixed warning about the private property of compendiums being discontinued.

Fixed issue when trying to find permissions for a document that doesn't support that functionality.

Added the option for GMs to drag and drop and actor onto the transfer currency dialog to change actors.

Added a right click entry for GMs to open the transfer currency for a specific actor.

Added a check to the currency transfer to make sure that the Loot Sheet has enough currency to cover the transfer.

Fixed issues with Active Tiles action for creating an Encounter.

Fixed issue where players couldn't close a Journal Entry.

Added the option to use a playlist as the background sound for a slideshow.  And the option to pause any currently playing sounds while the slideshow is playing.

# Version 11.02

Fixing issue when tabs get saved with entity data and they shouldn't be.

Fixed issue with opening journal sheets when the player doesn't have permissions.

Fixed issue with player dragging items to be sold in a shop.

Fixed issues with the enhanced journal directory functionality.

# Version 11.01

Added support for v11

Updated so that the edit property dialog doesn't refocus the enhanced journal.

Added the option to reorder bookmark.

Added the option to right click and open a bookmark in a new tab, or open it outside the enhanced browser.

Fixed issue with creating a new list entry

Fixed styling of the solid black, grey and white backgrounds so that you can see text correctly.

Fixed issue where sometimes the List type would get stuck and wouldn't change to a different version until Foundry was reloaded.

Added option to display inline links as either core, enhanced journal style, or APSJ style.

Fixed issue with having the option to use tagger when selecting a journal entry page for the MATT action to start an Encounter.

Added consistant actions for what to do with page images.  If the image does not exists, then it will always open up the FilePicker.  If the file exists and you are the owner of the sheet, then clicking will view the image, and right clickign will show a context menu that can be used to edit the image, open the image, or delete the image.  And if you are not the owner then clicking on it will view the image.

Fixed issues with highlighting the background sound on journal pages when stopping the sound.

Fixed issues with displaying the roll table formula when filling items using a roll table.

Fixed issue when assigning items to a loot sheet if the currency isn't a string.

Added a button to configure the list sheet type from the enhanced journal menu bar.  And added some helper text so that people know you can change the type.

Fixed issues with players unable to vote in a poll.

Added additional information when a progress has no information to display a progress bar correctly.

# Version 10.17

Fixing issue with the save button disappearing in Prose Mirror editors.

Fixed issue with broken inline links not being coloured red.

Fixed issue with roll table names being too long for the select drop down.

Fixed issue with dropping a folder of items onto a Shop taking forever to add them all.

Fixed issue with APSJ Blocks Panels, and Dialogs having html displayed in them.

Adding additional APSJ stylings.

# Version 10.16

Fixing an issue with the rendering Journal Entry Page hook when not viewing MEJ Journal pages.

Fixed issue with the sidebar directory repositioning when the window is reduced past a certain size.

Fixed issue with MEJ pages showing as blank.

# Version 10.15

Added integration with Monks Sound Enhancement to use the Sound Effects volume if it's available.

Added the option to drag a Journal onto the tab bar to open it.

Fixed issue with opening a Journal Entry not going to the correct anchor.

Fixed issue where the Journal sheet would always open to the anchor regardless of where you've scrolled to in the document.

Fixed issue where pressing enter in the Journal name text field was causing Foundry to reload.

Added the option to hold down the shift key when clicking on a tab to close a tab.

Added the option to hold down the alt key when clicking a tab to open a tab out of the enhaced browser.

Fixed issue with the enhanced browser title not changing if the active tab is open and the name changes.

Added a tooltip to the collapse and expand button for the sidebar directory.

Added the option to drag and drop reorder tabs.

Fixed issue with opening Actors in the enhanced browser.

Updated the checklist page to instead just be a generic list page, with 4 options to change the sheet into.  Regular list, checklist, progress list, and poll list.

Fixed issue with objectives not showing the secrets properly.

Added the option to transfer currency back to a loot sheet, or for players to grab a specific amount.

Added integration with Arius Planeswalker's Stylish Journal, so all the goodness from that module comes included in Enhanced Journal.

Completely redid the css files to support variables and to standardise it to make it a lot easier to alter.  When other systems and modules need to make changes to the MEJ styling.

Removed an conflict notification message when using Starfinder.

Added the option to display journal images to a chat message.

Fixed issue with how journal anchors are slugified.

Reduced the permission levels needed to view an inline content link.

Added a details tab to the shop sheet.  Which now includes an open and close time.  And a log of items that have been purchased.

Added world clock integration so shops can now open and close automatically based on the time in game.

Fixed issue with selling an item back to a shop if there were multiple GMs logged in.

Fixed an issue with dropping items onto an actor sheet if the system doesn't support dropping items onto an actor sheet.

Fixed an issue where selling an item back to a shop wasn't setting the value according the the sell back price.

Fixed an issue with Not config not updating the page dropdown properly when a journal was picked.

Added a field on the Note config to accept an anchor for the page.

Fixed an issue where MEJ pages were showing the pages dropdown in the Note Config.

Fixed issue with Polyglot.

Fixed issue with MATT integration.

Added the option to generate the shop or person name randomly.  Person names will also generate based on the ancestry in the Ancestry field on the sheet.

Fixed issue in the Encounter sheet when actors no longer exist.  It will now indicate that they don't exist, so you're not confused when they're not generated with the encounter.

Fixed issue with not being able to clear an image from an MEJ sheet.  You can now shift click it to remove it.

Added the option to pan and zoom a picture page or a Text and Picture page.  Hold the Ctrl Key down and use the mouse wheel to zoom, or click and drag while holding the ctrl key pan.

Fixed currency in the cypher system.

Added integration with Monks Sound Enhancement to show the journal page sound on the playlist tab.

Fixed issue with items that aren't identified showing as identified in the Loot or Shop sheets.

Fixed issue when rarity doesn't exist.

Fixed issue with offerings showing a broken image, and being clear about the quantity added. 

And made it clear when an offering is no longer active.

Added the option to only clear items that aren't locked in a shop.  You can hold the ctrl key down to clear them all.

Fixed issue where offering item image disappears once an offering is accepted.

Added the option to change the name of a Person sheet when an actor is linked to it.

Fixed issue with quest objectives not rendering the inline links properly.

Added the option to drop another shop sheet onto a shop to have it either replace or add items to the store.  Making it a little easier to populate from a known set of items.

Added the option with roll tables to either keep everything, only keep the locked items, or replace everything.

Fixed issue dragging a folder of items into a shop or loot sheet.

Added the option to drop a tab onto the chat window to create a chat card with a link to the journal.

Added permissions to individual list items so you can reveal items on a per user basis.

Changed the Race field to Ancestry field.

# Version 10.14

Fixed issues with opening MEJ with a new tab.

Fixed issues trying to render when the enhanced journal element hasn't been created yet.

Fixed issue trying to locate a map note when the note page hasn't been set.

Added item icons to the offering dialog

Fixed currency issues with systems that use a value with additional information.

Fixed issues setting the price for items in wfrp4e.

Fixed issues witht he autosave trying to re-open the journal entry when you've closed it.

Updated the Note creation code to use the image from the Loot Entry if there is one.

Fixed issues with creating a content link where the uuid is invalid.

Added the option to right click selected text and have MEJ find an item with that name, and replace the selected text with the content link.

Fixed issue with creating relationships when the player editing doesn't have write permissions on the secondary entry.

Fixed issues with showing the name of the Loot Entry selected.

Added the option to set a default loot name when creating new Loot Entries.

Fixed issues with displaying polyglot text on MEJ entries when players aren't using the enhanced journal browser.

Added item rarity to the Shop sheet.

Fixed issue with filling Quest rewards from a Roll Table.

Added notification when trying to create an offering, if the source isn't an actor.

Fixed an issue when assigning loot from a Quest.

Fixed issues when trying to open an actor. or import items from the shop owner context menu.

# Version 10.12

Fixed an issue with getting the price of an item in PF2E.

Fixed issues with Chat portrait moving the images around.

Fixed issue with editing items in a Shop.

# Version 10.11

Fixing some pages not remembering the scroll height of scrollable sections

Added the Event sheet

Fixed issues with the changes to the D&D 5e system.

Added Storyteller integration, so story teller pages won't open in MEJ and the story sheet is added to the sheet type dropdown.

Fixed issues with Foundry's autosave opening the Journal browser if it's closed.

Fixed error that shows when trying to open an Actor sheet in the enhanced browser.

Fixed issue dropping an actor onto a blank page not opening the actor.

# Version 10.10

Fix chat card stylings in PF2E

Fixed issue when finding default currency if there's no currency registered.

Fixed issue with opening a Note related to a picture entry that has limited permission.

Fixed issue with right click context menu nto appearing in the rihght place on long journal entries.

Fixed issue with default relationship images.

Fixed issue with missing relationships.

Fixed issue if relationship points to a page instead of a journal entry.

Fixed issue with actors linked to journal entries.

Fixed issues opening relationships on the Place sheet.

Fixed Actor link issues on the Quest entry.

# Version 10.9

Hid the Write to Journal action in Active Tiles.

Added dynamic fonts.

Tried to fix issue when extracting a Journal Page.

# Version 10.8

Fixing issue that requires Polyglot to be installed

# Version 10.7

Fixed issues with the save state overwriting requested changes

Added special classes to the Enhanced Journal browser to maintain some css styling that require the main form to be in the css path.

Fixed issue with PF2E css styling.

Fixed issue when activating the journal editor.

Fixed issue with PF2E when rendering the TextPageSheet.

Added code to maintain scroll height when changing between pages.

Changed font sizes so they will respond to changes in the Core font size.

Added styling to Journal Entry tabs that have data.

Fixed styling with currency labels

Fixed styling issues with wfrp4e system.

Updated the journal sheet sound effect button to indicate when the sound is loading.

Fixed issues getting system currency in pf2e.

Added the option to always show the Quest Objectives.

Fixed issue with currency text when displaying UPB.

Added default currency for SWADE, 13th Age, and AGE system

Fixed issues with getting embedded documents.

Added the option to extract an Adventure Book page to its own page.

Added the option to convert a single Adventure Book page to an Enhanced Journal page.

Added the option to drag and drop a MEJ Journal Page onto an Adventure Book page.

Fixed issues with displaying the selected Loot entry in the settings.

Fixed issue with dragging and dropping quest rewards onto a character sheet.

Fixed issues with integration with Active Tiles.

Fixed issue with Journal Page sounds only playing once, and never again once opened a second time.

Fixed issues with players being able to edit journal pages

Fixed issues in PF2E where unidentified items were showing as identified

Fixed the item description drop down in PF2E.

Fixed issues with items converted to scrolls no longer linking to the original item.

Fixed issues with getting the default Lootable name.

Fixed issue with adding a new item to a character sheet.

Updated the relationship interface to allow clicking on the image to view an image popout and clicking on the title opening the associated journal entry.

Updated Quest so that players can view rewards, provided the GM allows them to see.

Added dialog box to confirm deleting all slides.

Fixed issue with custom colour font entries in the sidebar directory.

# Version 10.6

Fixed issue with MEJ remembering the way Foundry Journals were last displayed.  So it will now keep track of the page mode, side bar collapse, and last page viewed.

Fixed issue with adding a page not appearing at the end.

Fixed issue with testing permissions of the Journal Entry.

Fixed issues with displaying the entity name when handling saving loot.

Fixed issue when single clicking on page images popping out the image while also opening the FilePicker.

Fixed issue with creating an inline link

# Version 10.5

Fixed issue with permission of Journal Page permissions

Fixed issue with remembering the sidebar being collapsed

Fixed styling in Alien RPG system

Fixed issue with right click context menu in Alien RPG

Fixed styling issue with Stars without number

Added an alert to let players without a default character know why they can't purchase from the shop

Fixed an issue with Fallout currency

Fixed an issue opening a compendium entry

Fixed an issue when no notes are present on a Journal Entry

Fixed an issue with links to compendium entries being shown as broken.

Fixed libWrapper warning with Advanced Macros

Fixed issue where editing an image entry that had no image was adding additional elements to the page.

Added the option to create a Journal Entry Page when trigger from Monk's Active Tiles, using the Write to Journal action.

Fixed issue with the polyglot menu not being added to MEJ pages.

Fixed issue with resetting result from a Roll Table

Fixed issue with the text on the context menu to remove an actor from a loot sheet

Fixed issue with opening the actor that's been attached to an Organization, Person, and Shop sheet.

Fixed the issue with a stray image being shown on the Place sheet.

# Version 10.4

Added support for opening inline links to specific pages within an Adventure Book.

Added the option to view the old journal sheets that had both text and image in tabs.

Allow document owners to add a page to an Adventure Book.

Added the status of the quest to the Objective display

Fixed styling issues with Warhammer

Fixed styling issues with The Witcher RPG

Changed the Loot Sheet display around a bit to make it a little easier to understand.

Updated currencies so they should work in Warhammer now.

Limited conversions to only convert if there is more than one currency to convert into.

Moved the inline request rolls to the Tokenbar module, since it's technically the one making the rolls.

Fixed the show to players dialog to default to image if the journal entry is a picture.

Fixed issues with chat bubble not finding the correct page to pull text from.

Added the option to set items in a shop to be consumable, so the player can pay for them, but won't receive the item.

Fixed issues when opening the appropriate document when clicking on the icons on a purchase request chat card.

Fixed issues with changing the icons on the Adventure Book table of contents when viewing as a single page.

Added the option to see images associated with Journal compendium entries.

Added an action to Monk's Active Tiles to be able to write text to a journal.

Fixed issue with checklist entry, when a non gm player tried to edit, and delete entries.

Fixed warning message when deleteing an entry in a checklist.

When creating an encounter, newly created creatures will get added tot he Encounter Monsters folder instead of being added to the root.

Fixed issue with adding encounter monsters from a compendium.

Fixed issue with players being able to see journal entries from a compendium.

Changed journal entries with images to open those images as a popout on right click, instead of expanding with the entry.  This should give you the option to show to players as just the image.

Added Narrator Tool commands to the right click menu that Enhanced Journal adds.

Fixed issue with pf2e when converting an removign currency.

Fixed issue where hidden shop items were being shown to players.

Fixed issue where loot chat message were incorrectly claiming the item had been purchased.

Respected the setting to not include the roll from table when adding items from a roll table.

Added the option to have offering go to the attached actor.

Added Leader to the Organization sheet.

Fixed issue with the scroll placement not being saved when a shop is edited.

Fixed issue with the height of the chat card in pf2e

# Version 10.3

Fixing a critical bug with opening inline journal links

# Version 10.2

Making sure that a player has permission to view a Journal Sheet before opening it.  This was affecting the recently opened links and previously viewed page.

Fixing the tool tip on a tab when the title changes.

Fixing search highlighting when using the Adventure Book rather than an MEJ page.

Fixed styling issues for the Vaesen system.

Fixed price issues with the Shadow Run 5e system

Added the option to open a journal entry from the sidebar directory using the alt key to bypass the browser.

Fixed issues opening document links within  a Journal Page.

Fixed issue if it an Adventure Book but has no pages

Fixed issue with creating a document link and the uuid isn't async

Fixed issues with showing a Journal Entry as a chat bubble

Fixed issue with getting the Loot Entity's name.

Fixed issue with pages not updating when they should

Fixed issue with inline links not rendering properly.

Fixed issue in PF2E with enriching the content text

Fixed issue with the shop icon that gets displayed in the chat message when requesting an item.

Fixed issue with dragging and dropping loot from a Quest onto an Actor.  And issue with how it deducts the item from the Quest.

Fixed issue with multiple notification when filling items from a Roll Table and the roll table runs out of items.

Fixed issue with item description not displaying the correct information.

Fixed issue with Loot page and trying to update the permissions on the entry.

Fixed issue with not being able to find the item attached to an actor when dropped onto the Loot sheet from an Actor.

Fixed issue with getting a relationship if that relationship isn't a Journal Entry or Journal Page.

Hopefully fixed an issue with the checklist refreshing the page when tryign to create a new entry.

Fixed issue with the Picture sheet showing instructions behind the image.

# Version 10.1

v10 changes.  Lots has changed with this release.  With the addition of Journal Pages in Foundry I had to find a workaround.  I think ultimately the idea is that the Foundry Journal Entry represents an adventure book, whereas the Enhanced Journal pages are meant to be stand alone, interactive sheets.  The pages that MEJ uses aren't meant to be in a book, but are meant to stand alone.

I also updated the interface when creating an encounter from the Encounter sheet.  Instead of dragging the icon to the map where you want the encounter to take place, you now click the button and draw a Measured Template on the canvas to denote the area you want the monsters to be created in.  This should avoid all the icons piling up around each other and allow a randomization of positioning.

# Version 1.0.65

Fixed issue with Journal Picture showing up strangely to players.

Added the option to turn off the NPC chat button toolbar icon.

Switched from using Notes Drop to Notes Preview for updating the icon image to prevent issues with other modules.

Fixed issue when dragging and dropping an item in starfinder not prompting for quantity.

Fixed issue where a custom note icon default to the acid icon.

Added cypher system currency

Added fallout currency

Added the option to set a tagger location to use for Encounters when created using Monk's Active Tile Triggers.

Added the option to select some text in a journal description, right click, and add that text to a chat message.

Added the option to split the journal from selected text and the right click menu.

Fixed currency issue with Mythras.

Fixed issue when trying to convert lower currencies automatically.

Fixed issues with Quest rewards not assigning XP properly.

# Version 1.0.64

Fixed issue with refreshing the Journal Directory when creating a new journal entry.

Fixed the position of the resize handle on the objectives dialog.

Fixed issue with dropping an item from a shop onto an Actor in sfrpg.

Fixed issue accepting an item that a player requests.

Fixed issue where the loot chat message was looking like the shop chat message.

Fixed issue with naming additional Loot Entries.

Added the option to let currencies use dice notation.

Fixed issues with localization on individual slide config screen.

# Version 1.0.63

Fixing issue with PF2E and saving the editor contents.

# Version 1.0.62

Added the option to add permissions icons to either both directories, just the MEJ directory, or neither.  In case you use a permissions browser other than MEJ.

Removed the simple calendar folder form the MEJ directory.

Fixed an issue where creating a Note from Simple Calendar was opening up MEJ.

Added the option to apply the system tag to the MEJ subsheet, this can either fix styles or break the sheet.

Added styling support for the Kult system.

Added suport for using Dark Mode.

Added the option to turn NPC chat bubbles on or off from the Token menu.  This will allow the GM to trigger the chat bubbles, and also turn them off during combat.

Fixed issues with PF2E and the styling of journal entries.

Fixed an issue with PF2E and inline links.

Fixed issue in PF2E with purchasing items.

Fixed issue in PF2E with dropping items onto an actor.

Fixed issue with PF2E and unequipping the item before adding it to an Actor.

Added a button to create a new journal entry when viewing a blank entry.

Added the option to set the quantity of the item rolled from a roll table.

Fixed an issue with saving a brand new quest.

# Version 1.0.61

Fixed issues with displaying creature sheet in 3.5E

Added the option to make an offering or bride a person.  The Offering tab is now available on Orgaization and Person sheets.

Added styling fixes for Chronicles of Darkness

Fixed issues with DC attribute names and how they were being displayed.

Fixed issues with internationalization and the TinyMCE menus

Fixed issues with preventing sharing Loot journals with players.

Fixed issue when creating a new Quest in Forien's Quest Log opening up and Enhanced Journal page aswell.

Updated the inline links to only be hidden if the player has less than limited permissions on the entity in question.

Added currency support for SFRPG.

Changed electrum to have a convert value of null.  Seriously... who uses Electrum.

Fixed issue with the placeholder value of the Journal Listing dropdown.

Added Start Encounter and Select Encounter as to new actions to be used by Monk's Active Tiles.

Added the option to drag and drop the Journal Type icon to the canvas to create a note.

Fixed issue with getting the default currency

Fixed issue with playing sound that wasn't set to autoplay

Added the option to sort items in Shop and Loot sheet by price or quantity rather than just name

Fixed Item description in SWADE

Change the Reward "Active" check box to "Selected" to hopefully remove some confusion.  And updated the code so that only one can be active at a time.

Added buy back options for the Shop.  You can not set it so the player can't sell back, has to confirm, and can do so without needing GM intervention.

Added the option to set the buy back rate for the shop.

Fixed localization issue with Slideshow effects list.

# Version 1.0.60

Fixing an issue with conversions

Adding styling updates for Forbidden Lands

Fixing issue not being able to change the journal a Note was pointing to.

# Version 1.0.59

Fixed issue with getting the correct cost of an item.

Fixed issue displaying Qust sheet.

# Version 1.0.58

Fixing some issues with the background sound of journal entries.  Clearing the value had some issues, and initially setting it wasn't showing the play sound control.

Added the option to use a dice roll for quantity to roll from a roll table when populating a shop or loot entry.

Updated the loot entry and shop so that it would remember the last roll table used for that shop or loot entry.

Added a new setting to only add characters to a loot sheet from players that are currently logged in.

# Version 1.0.57

Fixed a whole bunch of issues withthe language files, and went through the code to put strings in the language file.  Apologies to those people who are maintaining other languages, as there's now a whole bunch more translations.

Updated the currency distribution to only calculate those currencies that can be converted.

Added the ability to add background sounds to a Journal Entry.  So if you have a blacksmith shop you can now auto play black smith sounds when you open the entry.

Fixed issues with rpg-styled-ui locking the drop down on some of the entries.

Added the option to follow a Journal Link to an anchor on the Journal Entry page.  Add `#AnchorName` to the end of the Journal Entry id and clicking the link will scroll to that anchor when the entry is opened.

Added the option to select a custom image for a Note Icon.

Fixed issue with default currency in PF1E

Rewrote the function that calculates conversions when trying to buy things and you don't have enough money of the exact currency to pay for it.

Fixed an issue with PF2E and the new way they're handling currency prices.

Fixed an issue when trying to find the default currency, it was using old code and wasn't updated to use the custom currency data.

Fixed an issue with displaying item information for systems that don't implement the getChatData function

Fixed slideshow so that changing the volume will affect the currently playing slideshow

Fixed Aliens RPG footer

# Version 1.0.56

Changed the icon list for the Notes Config so that it shows the actual image, making it a little easier to pick something that represents what you want.

Ignoring opening text editor links from dialogs that shouldn't be opened in Enhanced Journal

Fixed issues with Picture Sheet loading improperly for players.

Fixed relationships on the Place sheet.  Instead of Shop, Person and Organization tabs, the Organization has been changed to a generic Relationships tab, so that places can be linked to other places.

Fixed issue with editing attributes so you can actually change the hidden attribute

Swedish translation have been updated, thank you rangertheman

# Version 1.0.55

Fixed an issue with saving attribute data on the Place Sheet.

# Version 1.0.54

Added the option to reorder person and place attributes

Removed some debugging code accidentally left in that was preventing the Place sheet from responding to hidden fields.

Added the option to add a relationship between places and other places.

Added German translation, thank you Miccolo02

And a late thank you to GSBicalho for providing the base code for editing attributes.

# Version 1.0.53

Added the option to edit what attributes are being shown on the Person and Place sheets.  So those sheets can now be fully customized how you want them.

Fixed an issue with the Note HUD where toggling visibility wasn't showing the correct highlighting.

Fixed issues with the details section disappearing in a system... that I can't remember right now.

Fixed issues with clicking on an NPC to display the NPC chat messages from a Journal Entry.

Added the option to have some NPC chat messages only appear to the player that clicks the NPC.

Fixed issues with dScryb nearby sheets being "caught" by Enhanced Journal.

Added default currency to AE5.

Added an Active Tile action to change the status of a Quest.

Fixed an issue with dragging monsters off an Encounter sheet.

Fixed an issue with displaying a Journal picture to a player.

Allow a quest to have a relationship to another quest.  This way you can have sub quests linked to a main quest.

Fixed an issue with quest sheet not showing the default image properly.

Added perception to the list of attributes for PF2E.

# Version 1.0.52

Changed how currency is being handled.  Instead of relying on the system to give us the information, I've changed to storing it with the module.  So you can now customise what currency you want to use.  Be aware that this will not affect the Actor sheet, so make sure the Actor has the currency you want to use.

But, this also means that I can now split currency evenly and then if there's any left over, convert it to the next lower currency.

And, it menas when purchasing items, it will now check to see if you have enough and draw from other currencies to make up any difference in purchase price.

Fixed error with adding DC if the system doesn't have any attributes to base a DC on.

Update the window title when a new tab is opened so if the window is minimized you can see what sheet is opened.

Switched the Objective Display to use an actual application window, this will allow you to reposition it where you'd like it.

Changed the styling of inline anchor links so they don't look like html anchors, but look more like inline clickable links.

Added the ability to collapse and expand item list on Encounters, Quests, Loots, and Shops.

Added styling fixes for Shadowrun 5e.

Added the option to hold down CTRL while clicking on an inline Scene link, to have it open and activate the Scene.

Added a dialog to the editor window to generate a Roll Request.  Makes it easier to generate the properties rather trying to remember what the syntax looks like.

Added the option to refill all items on the Encounter and Quest sheet.

Fixed issue where editing then closing the editing was hiding the side menu.

Fixed issue where clicking on the edit description button was triggering even if you weren't looking at the tabs where the description was visible.

Fixed getting results from roll table, if there are multiple results associated with the same roll.

Fixed issue with adding relationships to Journal Entries in a compendium

Fixed issue with sheet that gets opened when a player opens a Picture, or a Journal Entry that's just a Picture.  It should like like an Image Viewer rather than a Journal Entry.

Updated the Quest Objectives to use a text editor rather than just a textbox, so you can have fancy objectives.

Fixed issue with slideshows not loading the thumbnails if the player is viewing it.

Updated the slideshows to automatically start if a player is viewing it.

Fixed an issue where closing a Journal Entry that was playing a slideshow wouldn't stop the sound from playing.

Fixed an issue with editing the quantity of items in an Encounter.

Swedish translations, thank you rangertheman

Chinese (Taiwan) translations, thank you zeteticl

# Version 1.0.51

Added the option to hide the bookmark bar.

Added the option to turn on the extra menu bars for all journal entry descriptions and not just the regular journal entry.

When using the HUD to give players permission to view an entry, there's now a setting to assign observer and not just limited.

Fixed issues with Slideshow.  When creating a new slide the thumbnails don't create properly.  And additional slides wouldn't save correctly.

Fixed a whole bunch of styling issues.

Fixed issues with slideshow sounds not responding to Global Audio volume.

Fixed issues with quantities being able to be set to zero and negative values.

Removed the equipped status of items added to Loot and Shop sheets.

Added support for having text anchors in text descriptions.

Fixed issues with PF2E and setting quantities.

Added price calculations for PF2E and PF1E so it can convert from decimals to the appropriate denomination isntead of translating to 0.

Added helpful instruction to click on the picture to add image

Added option to handle duplicate items rolled form roll table.  You can now choose to have duplicate items increae quantity, add a second item, or do nothing.

Fixed issue when dragging an item from a shop onto a player not adding the item to the player.

Added the option to open an actor sheet in a new window when clicking on attached actors.

Fixed issue with relationship images not defaulting to the correct default image for the type.

Fixed styling issues with request chat cards and PF2E.

# Version 1.0.50

Added the option to drag and drop items between Loot Entries

Change the slideshow so that images are being buffered.

Fixed issues with the Actor sheet not scrolling

Added support for dScryb

Added option to change the background colour used when the slideshow fills the screen rather than in a window.

Fixed issues when create a new Journal Entry

Fixed an issue with saving changes to the Notes text area.

Added check to make sure that Notes aren't editable if the GM isn't present.

Fixed an issue displaying infinity quantity items when Zero Quantity is set to be hidden.

Sorted item lists by type, so when items change the categories don't shift around

Added option to add a relationship between two organizations

Fixed an issue with showing the picture of a Journal Entry to players

Fixed an issue when converting to a Place Entry

Fixed an issue saving the sound file for Slide

Added the option to fill loot currency from roll table.

Fixed issue when creating a PDFoundry entry.

Added the option to exclude Rolltables from compendium when generating loot.

Fixed icons for the sidebar directory listing.

Fixed styling when right-clicking on a custom coloured directory.

# Version 1.0.49

Fixing some very generous shops.  They were paying the players to take their items.

And fixed an issue where Person sheets weren't loading if they didn't have a character attached.

# Version 1.0.48

Swapped the highlight on the Note HUD so that the invisible icon reflects the when the NOte really is invisible to players.

Added transition effect to the slide show.

Added sounds to individual Slides, the default transition and default slide duration for all slides.

Added the option to automatically play a slide show when a scene is activated.  Change the Journal Entry for the Scene to a Slideshow and it will automatically 

Fixed issue with purchasing while there is not GM present.

Fixed an issue where selling from a player wasn't checkign to see if there was still enough left to complete the sale.

Added relationship field to the Organization sheet, and Quest Sheet

Added the option to drag a Shop Keeper or Person actor onto the canvas

Added relationships between Point of Interest and Person or Place.

Fixed issues with purchasing items that have decimals.

Started to add currency for the AGE Systems

Fixed issue with person sheet if the actor linked to the sheet didn't exist any more.

Removed the two way relationship update between Person entries.  I believe that the rest can stay as it's all dependant on the relationship a Person has with something.

Rebuilt the way prices, currency, and quantity is handled.  This should make things a little easier to read and some what stabler.

Added the option for the GM to specify the quantity of items being added to the player via the shop.

Fixed an issue with the Quest Sheet not remembering scroll positions on the reward items tab.

# Version 1.0.47

Fixed an issue with hiding inline links if the link is broken

Added support for Swedish language, thank you Rangertheman

# Version 1.0.46

Added an interface to distribute coins a bit better.  You can set some characters to not receive a share by emptying out the string before splitting.  And you can now assign the leftovers to a single character in case your players want to keep a party fund.

Fixed issues with players being able to edit a Journal Entry they shouldn't have access to.

Fixed issues with Warhammer and the styling of the menu buttons when editing a Journal Entry

Fixed issues with Tormenta 20 and being able to add and buy items from shops

Added the option to hide inline links for Journal Entries that players aren't supposed to know about

Fixed issues with Forien's Quest Log not being recognised as a window not to open in Enhanced Journals.

Added the option to sell items back to shops.

Added the option to purchase items in quantity.

Fixed issues with creating an encounter not finding a vacant spot properly.

Fixed issue where the GM wasn't being notified when a player purchased an item.

Fixed issue when creating an encounter from a Roll Table

Added two way relationships between Journal Entries, and added the option to hide that relationship from players.

When spells are purchased from a shop or loot sheet they will be converted to a spell scroll, if you're using DnD5e.

Allow a wider range when adjusting the price.  And remembering the price adjustment so that items sold back to the shop will use that conversion.

Showing who has permission to see the loot sheet a little easier and added a convenient button to change the permissions.

# Version 1.0.45

Fixed issue where the items list in a Shop would scroll back to the top when items are edited.

Fixed issue with text colouring in Warhammer

Changed the Note HUD so for Shop and Loot notes, making it visible for players will give them Observer permissions rather than just Limited.

Added the option for players to cancel a shop transaction.

Changed the default icon applied to Shop, Loot, Encounter, and Place notes dragged to the canvas.

Fixed issues with the latest version of Polyglot

Added the option to set the quantity of monsters in an Encounter to allow for formulas, so you can have the Encounter roll for monsters.

Fixed issues with filling Loot and Shop from Rolltable.

Fixed issue with Place sheet showing relationships that player doesn't have permissions to see.

Added support for SWADE currency

# Version 1.0.44

Fixed an issue where the submit button of the old journal sheet was causing the entire page to submit.

Added an error message to the dialog that sends journal entries to players if there are no players selected and Show All isn't pressed.

Fixed an issue where newly created journal entries weren't getting the type set properly.

Fixed an issue where players gold wasn't being subtracted when they could purchase the item themselves.

Fixed issue with the way some systems handle currencies.

Fixed issue when the default sheet class was changed, the journal sheet wasn't updating.

Fixed issue with updating monster quantities in Encounters

Added the option to create an encounter with some tokens hidden.

Fixed issue with showing to players when the sheet is not within the enhanced browser

Updated the Loot sheet to select the current party if no characters are added.

Added a button to grant items to players that request them in the loot sheet.

Added a button to add the current party to loot sheet.

Fixed issues with quantity if it's an object rather than a number

Fixed issue with Person sheet not able to remove relationships

Fixed issue with short term goals not being shown on the Person sheet

# Version 1.0.43

Fixed an issue where opening tabs automatically wasn't checking to see if the tab was already open.

Fixed an issue where scroll bars were no longer showing with the tab sheets

Added increased width to the currency fields

Added price to the description of the Loot and Shop item.

Set the default currency to system specific currency rather than just using gp.

And added Item summaries for Quest and Encounter sheets

# Version 1.0.42

Fixed an issue importing items from Shopkeeper

Fixed an issue with getting the Item document.

# Version 1.0.41

Fixed some styling issues with the Fallout system

Fixed tabs not working in the AGE system

Fixed an issue where warning that Lib: Document Sheet Registrar was conflicted was preventing the module from loading.

Added the option to add monsters to Encounter via a Roll Table.

Added the from column for the Loot Entry, so you can see what token contributed what item

Fixed an issue where Person relationship could be seen by players even if they didn't have permissions to know about it.

Removed the Actor associated with a Person sheet for players.

Allowed Person sheet to have relationships with Shop, Point of Interest, and Quest.

Fixed an issue when adding an Actor to a Place.

Fixed messages displayed when no items have been added so that it says one thing for the player and a different thing for the GM.

Fixed an issue where the players associated with the Loot sheet would show to the players.

# Version 1.0.40

Added the Loot sheet.  Using this sheet you can drag players to the entry, if they aren't already there.  And split the money associated witht he Loot evenly between the characters.  You can also drag items from Loot onto the character icons to add the items to the characters inventory.  Like the Shop sheet, you can set it so that only the GM can control item distribution, players are allowed to take their own items, or they can make a request for the item.

Along with that you can now, in the settings, tell Enhanced Journals what you want to do with Quest or Encounter treasure.  You can have it create a new Loot Sheet or add the items to an old Loot sheet.  And there's integration with both Lootsheet and Merchant sheet to create actors and add the items to them.

The Shop sheet has also been updated, it will now try and deduct the money from the characters currency.  You can save the item using what currency it should be associated with.  So if something is worth 5 silver peices you can save the item price as `5 sp`.

Using the Shop, there is now a link for players to click on to buy the item, rather than relyign on them dragging and dropping to their character.

You can also now fill a Shop and a Loot sheet using a Rollable Table.

There's also now a Text only Journal Sheet.

I've added the option to open Journal Entries in a new tab automatically.

Fixed an issue where opening Journal Entries wasn't properly checking if the user had permissions to view it.

Added Inline Rolls to the text description form Journal Entries. `@Request[perception dc:15 silent fastForward rollmode:selfroll]{flavor text}` and also added the option for Contested rolls `@Contested[strength strength silent fastForward rollmode:selfroll]{flavor text}`

Fixed an issue with the way items were being added to the Journal Entries.  I was adding them by just their ID, but discovered that if the item came from a compendium and the compendium was deleted, or if the item itself was deleted then the item would disappear from the Journal Entry.  I've changed it so that Journal Entries will keep a copy of the item data.  Now if the Journal Entry is added to a compendium, it can be transfered to a new world without data loss.  Because of these changes, be aware that Shopkeeper items will no longer automatically show up.  You need to right click on the image to import the items from the Actor.

Fixed an issue with saving user notes.

Fixed some text issues when creating a new Checklist

Added the option to Clear all content from a folder

Fixed an issue with Slideshow buttons not workign when using Popout!

Fixed an issue with Checkbox search box sizing.

Added currency to Encounter Loot, and also expanded the tabs so that Monsters, Loot, and DCs are on separate tabs.

# Version 1.0.39

Removed adding the system to the subdocument.  I know this is going to mess up the styling for PF2E, but the change was really messing up the stylings of all the other modules.

I think I found a way to work around the issues with Lib: Document Sheet Registrar.

Fixed an issue where players could see what Journal Entry was linked to a token for token dialog.

Fixed an issue defaulting the price of shop items.

Fixed an issue with Encounter sheet and Shop sheet not saving.

# Version 1.0.38

Added option to open a Journal Entry by clicking on an Objective link.

Added the option for a counter on objectives.  In case they require doing multiple of the same thing.

Added the option to display Objectives using a toggle button on the toolbar.

Fixed an issue with saving lists on a Journal Entry.  Core changed some things and I think introduced an error.

# Version 1.0.37

Fixed issues with drag and drop

Changed the slide show config to allow you to visually create text.

Fixed some issue with slideshows not stopping properly.  And with the text not showing properly.

Added option to change the background colour for slide show texts, and set the transparency of the text.

# Version 1.0.36 

Updating the code to make it v9 compliant.

# Version 1.0.35

Fixed issue with Person sheet.  Rolle value wasn't saving due to a spelling mistake in the code.

Fixed the positioning of the Note HUD.

Cleaned up the Note drop down to select a journal.

Fixed an error when trying to open the Note HUD and there wasn't a valid Journal Entry attached

# Version 1.0.34

Added a function to re-convert quest rewards.  There was some conversion problems with a previous version, the old data is still saved, but if the new data is created in error then it won't check the old data again.  The new function should correct the issues.

Changed the images to divs so that Journal Scaler will function properly.

Fixed issue with journal sheets being displayed in Monk's COmmon Display

# Version 1.0.33

Fixing issue with Pathfinder drop down

Generalized the default object created by Enhanced Journal

Fixed some issues with converting between old reward and new rewards

# Version 1.0.32

Added styling fixes for Rippers UI

Fixed keyup issue with the search input

Added some error trapping when trying to find the entity for the Journal Sheet

Removed the option to open a new tab if you are currently editing one.  It just ended up causing too many issues.

Moved item drops to their respective sheets so they are independant of the Enhanced Journal and can function on their own.

Added a HUD to the Notes layer, so you can now right click to hide/show a note to players, begin an encounter, and assign loot to a loot character.

Fixed an issue with TinyMCE styling if the system doesn't set it as an array

Fixed an issue where clicking on an entry in the sidebar wasn't opening the entry.

Added checks for Monk's Common Display so that the entries aren't opened in the Enhanced Journal

Fixed issue when checking for Quick Encounters

Added Hook so other modules can determine if a journal entry should be handled by Enhanced Journal.

Added option to show if folders are sorted alphabetically or manually.

Showing the players actual permission levels in the tooltip on the sidebar.

Added remaining quantity for items.  So you can set what it's supposed to be and keep track of how many have been removed.

Also added a button to refill the quantity.

Added option to assign an Actor as the one to receive items.  So you can have a loot character.

Fixed an issue that data toolbox was creating

Fixed issue with Checkbox List context menu

Added create encounter, create combat and select combatants draggables and buttons to encounter sheet

Fixed issue with entry that has limited permissions and how it opens for the player

Fixed issue with the Sheet configuration button showing for players

Added pronouns to the Person Sheet

Added statuses back to the Quest sheet.  I tried to work around it, but it just doesn't make sense without them.

Added multiple rewards in case you need to have a different set of things depending on how the players perform.

Added option to show or hide shop items from the player if the quantity is zero.

Fixed issue where purchasing from the shop wasn't decreasing the quantity available.

Fixed an issue where hidden items in the shop where still showing as an empty category to the players.

# Version 1.0.31

Added styling fixed for Warhammer

Fixed an issue where Scene Notes wouldn't open in Enhanced Journals

Fixed issue where the correct quest colours weren't being shown.

Added tooltip to show what kind of permissions everyone has in the Journal Directory.

Added relationships to the Person entry

# Version 1.0.30

Fixed an issue with some modules having a rendering issue.  I wasn't creating the subsheets element properly.  At least not in the way they would be expecting.

Fixed an issue where blank tabs were callign the render Hook.  Which made no sense to any modules that tried to capture that.

Moved the creation of control buttons to the Enhanced Journal rather than the pages themselves.  And updated the Hook appropriately.  This will allow other modules to add buttons as needed.

Ignoring the creation of Quick Encounters journal entries.

Fixed an issue, I think, where the confirm box was preventing the Journal Entry from being edited again on the stand alone app.

# Version 1.0.29

Fixed issue with Quest currencies when the system doesn't have any.

# Version 1.0.28

Fixed an issue where newly created Journal Entries were being opened for players that were allowed to use the Enhanced Journal browser.

Added Spanish translations, thank you lozalojo!

Added French translations, thank you remiverdel!

# Version 1.0.27

Fixed issue with chatbubbles

# Version 1.0.26

Fixed issue when Enhanced Journal opens on a brand new world and no tabs have ever been opened.

Fixed rendering issue, it wasn't waiting for the parent to finish rendering first before trying to render the subsheet.

Fixed issue where it was trying to save scroll positions even if a subsheet didn't exist.

Updating the tooltip text of the edit/save button so it displays the correct text.

Clearing out the journal value when the journal closes.

Changing the recently opened to use uuid instead of just id in case Compendium entities are opened.

Correcting styling issues with various systems (DnD3.5, SFRPG, SW5e)

Added option to open chat links outside of Enhanced Journal by holding the Alt key while clicking.

Added option to double click on a Note or Token and display the text of a Journal Entry as a chat bubble instead of opening up the Journal Entry.  If the Journal Entry contains just a unordered list then one of the entries will ranbdomly be used.  If an ordered list is used, then it will select each item in sequence.  With no list, it will use the text in the Journal Entry.  Turn on this feature by selecting the "Show as Chat Bubble" setting.

# Version 1.0.25

Enhanced Journals will now save the last scroll position of the entry that you're on.  So if you change tabs and then come back you don't have to scroll to find where you were.

If Active Tiles is trying to select a journal entry, then Enhanced Journals will bypass opening the entry.

Fixed issue when creating a Journal Entry.

Fixed an issue when a slideshow is closed while a slide text is set to fade out.

Fixed an issue with Quest objectives.

# Version 1.0.24

Fixing a filename issue.  SlideshowSheet vs SlideShowSheet

# Version 1.0.23

Fixed an issue with players getting an errors when loading a journal entry.

After a journal type is changed, refreshing the main sidebar.

Fixed issue where opening a journal entry as a player was opening up the full version even if it's supposed to be disabled for players.

Fixed an issue where items that no longer exist would crash a Shop.

Added drag and drop instrustions to the Place entry if there are no items.

# Version 1.0.22

Oh where to begin with this update.
The whole module has been rebuilt so instead of overwriting a Journal Entry, the browser part is it's own application and each Journal Type is it's own sheet now.  This gives greater flexibility for improvements int he future as well as inter-module communications.

I am expecting it to break somewhere as the changes are massive.

Things to note... that I'm sure doesn't cover everything, since I fixed things as I went.

Added the option to open the browser with the file menu collapsed.

Changed the Quests from having a status to having the option to "Show the quest to Players", "Show the Quest in the Notifications window", and "compete the quest".  I think this trims down the options nicely.

Added the option of players requesting a purchase, or dragging the item itself if the GM allows it.

Cleaned up the Journal Entries so that when shown to a player, they only reveal what they should reveal.

Changed slideshow text to allow for multiple texts to be added.

Added animations to the texts so they can fade in and out.

Encounters will let you drag and drop the group of monsters onto the scene.

You can create a Journal Link that opens up just the picture.  Instead of using @JournalEntry[9WdmdaZAzXSN1nih]{Test Picture} change it to @Picture[9WdmdaZAzXSN1nih]{Test Picture} and when you click on it, it will open just the image.

A new Journal Type has been added, Checklist.  This will let you create a list of items that you can check off.

And players can now purchase things from a shop.  Either by dragging it to their character themselves or requesting it from the GM.

# Version 1.0.21

Fixed issue with toggling the folder navigation.  Showing an Actor, then going back to a Journal Entry would displace the lines.

Added Point of Interest

Fixed issue where old Place entries weren't loading due to the new features added not being initialised.

Added Type field to Place, so you can show what type of settle ment it is, Village, Town, City, Metropolis, etc.

Changed City back to Place

# Version 1.0.20

Fixing issues with removing Forien's Quest Folder

Fixing issue with editing the person and city fields.

Fixing issues with importing from compendium

# Version 1.0.19

Added the option to edit the fields that are seen on the person and city sheets

Fixed issue where the Description tab was always starting as active

Addes Shops!

Prevent a Forien's Quest Log from being loaded into Enhanced Journal

Added links to navigate through enties in a folder

Changed the magnify image buton to a right click instead so the interface was cleaner.

Changed polyglot rendering so that you have to click to translate.  I liked the hover over but it cause way too many issues with formating.

Added inline request roll, so you can add a link to request a roll.  Currently the syntax is %[perception 15]% to request a perception roll with a DC of 15

Fixed conflict between Enhanced Journal and Kanka

Fixed issue when copying journal sheets to and from a compendium.

Preloading polyglot fonts to speed up loading of Journal Page

Added Notes to Encounter sheet

# Version 1.0.18

Added option to reorder slides by dragging and dropping.

Fixing an issue with GM Screen, it preloads a dummy version of a Journal Page, and I need to check that first and load a new page if it's active.

Changing the edit pencil icon to a save icon when editing.

Checking for changes appropriately instead of just checking if the editor is open.

Fixing issues with Slideshow

Fixing issue with Polyglot, the module added an API and required a small change with Enhanced Journal.

Updated the Person sheet to show more information.

Added option to delete an attached actor from a Person Sheet using right-click.

Fixing styling issue with Pathfinder

Fixing issue with adding polyglot css when polyglot isn't an active module.

# Version 1.0.17

Fixed the issue with rendering again.  Hopefully this is the last time, but I'm not holding my breath.
This time to fix issues with Trigger Happy.

Altered the editor with journals so you can have a lot more control over the content.  Adding in the menu bar gives you access to text colour, formatting, font, font sizes, etc.

Added the option of changing the background of a Journal Entry.  You can set it to a colour, or an image and control how that image is displayed.

Fixed an issue where opening an Actor in Enhanced Journal, then going back to a previous entry would stop the tabs from responding.

Changed the way Journal Entries are shared to players.  Now if the Journal Entry you're sharing has only text content or an image content, the tabs won't display.  If they're not needed, then they'll just get in the way.

Changed the way embedded Scenes are opened from a Journal Entry.  Before it would open up the Scene config dialog, now they'll actually activate that scene.

Added three more fonts.

Added the drop cap style.  Yes these are borrowed from the "Custom Journal" module that doesn't seem to work any more.

I swear this change is going to break something, and I apologize in advance for that happening.

# Version 1.0.16

Fixed issue with rendering of the journal.

Added check to see if the journal entry is being edited before allowing the tab to change.

When removing tab that isn't the active one, don't switch to a new tab.

Fixed issue when players that are allowed to use the full journal open an entry they can view.

Allow Journal Entry to share to players as just a picture.

Fixed an issue with a command change in Foundry. _onClickEntityLink to _onClickContentLink.

Increased the width of the quest status bar.

Fixed issue with spelling mistake when getting a setting.

Fixed issue with secret comments not being displayed properly.

# Version 1.0.15

Fixed conflict with Collapsible Journal Sections that prevented notes from being opened.

# Version 1.0.14

Added support for Collapsible Journal Sections.

# Version 1.0.12

Fixed issue with Scene Linked entry not opening properly.

Fixed compatibility with quick insert

Added collapsable right menu

Added option to add tab without activating it.

Fixed issue where opening an item from a locked compendium pack would thorw an error

Added option to extract text from a journal entry into a new journal entry.  Kinda like what Furnace did with splitting a journal, but you have to select the text in Enhanced Journal.

Added option to loop a slideshow

Updated the colours for the journal directory so that custom directory colours have better readable text

Updated the journal entry dropdown for notes dropped on the canvas.  Before it was just a random jumble, now it's a list that works similar to the sidebar directory list.

Changed the "open in new tab" from shift click, to ctrl click, as shift click was highlighting text

# Version 1.0.11
Added option to see the player permissions on the directory

Added currency option to quest

Fixed up polyglot not updating properly

Fixed issues with entity links reverting after saving the entry.

# Version 1.0.10
Fixed issue when deleted entries are loaded.

Fixed issue when entries are created.

Fixed issue with folder sizing in PF1

Added option to assign XP with button

# Version 1.0.9
Fixed issue with player viewing encounter log while GM creates a new entry, that entry would appear in the players enhanced journal.

Fixed issue with Polyglot integration

Added option to set permissions when showing to players.

Added option to show picture when viewing an Actor

Added option to open Actor sheet from Actor tab

Fixed issue where selecting an old journal entry that was just a picture and then changing to an enhanced journal, wouldn't display anything.

Added option to see both text and picture for journal entries regardless of if they're old or new.

Fixed an issue with slideshow sound not saving.

Fixed a really strange issue where if there's only one text control on a window, pressing enter in it will cause the webpage to submit.

Added option to shift click and open an entry in a new tab.

Fixed issue with adding Compendium items, was missing the pack id

Fixed issue when creating a new Entry, it wouldn't load the new entry properly.

Hiding Forien's Quest folder if that module is running and the folder is not to be shown.

# Version 1.0.8
Added button to exapand an image to the full size of the window.

Fixed an issue with drag and dropping directory items.

Fixed an issue with dragging and dropping items onto actors.

Fix tab styling when a tab gets really small.

Added option to convert to different journal types.

Fixed issue with cancelling sent images.

Added support for Forien's Quest log items.  It's not quite correct, the text isn't uploading properly, but the rest of the details are uploaded properly.

Added Organizations

Fixed issue where deleting items wasn't refreshing

Recording where the items were dropped

Fixing issue where dropping the same item on Rewards or Items would duplicate the item.  Instead it just increases the Quantity.

Fixed issues with playing the slideshow.  The sound will now quit playing when the slideshow has stopped.

Fixed issue with the tab titles not updating.

Fixed issue when trying to load a Journal Page from a Compendium... I honestly didn't even know those existed.

Fixed an issue opening journal entries links from descriptions

Fixed and issue when showing players if no players are picked

Fixed an issue with creating a new slide, but not actually saving it, still leaves the old slide

Fixed an issue with editing when you should be allowed to edit.

# Version 1.0.7

Fixed an issue where you could bookmark a blank tab

Fixed an issue where a blank tab would lose the "New Tab" title on reload.

Fixed an issue with the Directory reseting the scroll top when rendered.

Fixed issue where players could right-click the journal directory tab and it would pop up the last viewed entry.

Fixed an issue with players saving to a journal entry

Fixing an issue where the styling of the editor got dropped.

Adding Recently Viewed to blank tab

Changed Quest merged Seen/Completed into one status. 

Adding color highlights to show what state a quest is in.

Added Objectives display when Notes tool is selected

Updated the styling to support Pathfinder

Fixed an issue with localization of attribute in the Encounter entry.

Embedded item links no longer open a blank page.

Added Maximize button.

# Version 1.0.6

Fixed an issue when creating a new slideshow, it was trying to access the currently active slide and since there wasn't one, it was causing an error.

Deleting a journal entry wasn't refreshing the page if it was open in the current tab.

If a DC was attempted to be added, but wasn't saved properly, the old DC was still there but causing errors.  I changed the code so that DCs aren't created the first time until the save button is pushed.

Dragging items onto the Quest entry wasn't working.

Journal Notes weren't cross linking to other notes.  Looks like the way the TextEditor was sending the information wasn't compatible with the Enhanced Journal.

Directory Searchign is fixed.

Also thank you to Riccisi for some amazing debug work.
