import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {getPlaylistVideos} from './grpFunctions';

// Remember to rename these classes and interfaces!

interface HotMessSettings {
	APIKey: string,
	videoFolder: string,
}

const DEFAULT_SETTINGS: HotMessSettings = {
	APIKey: 'default',
	videoFolder: 'default'
}

export default class HotMess extends Plugin {
	settings: HotMessSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a custom notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// GRP - List all Files command
		this.addCommand({
			id: 'list-all-files',
			name: 'List all files',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const activeFile = app.workspace.getActiveFile();
				var allFiles = app.vault.getFiles();
				allFiles.forEach(file => {
					// The wikilink to the file, using the base name as an alias
					// if there are duplicate file names in different folders.
					// The alias is not used when the file name is unique.
					// That's the right result, but I don't understand why.
					const link = app.fileManager.generateMarkdownLink(file, "", "", file.basename);
					// Outputs link to file at cursor
					editor.replaceSelection(link+"\n");
				});
			}
		});
		// GRP - Request to Youtube url
		this.addCommand({
			id: 'request-youtube-pl',
			name: 'Request Youtube Playlist',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const plId = "PL3NaIVgSlAVIDaYB0yeH3lnB9CZ0Hp_xs";
				// const apiKey = "AIzaSyA_ZTDB3Q2KVEkHK9bwi50MZj9r3kBofJk";
				const plData = await getPlaylistVideos(plId, this.settings.APIKey);
				console.log(plData);

			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check functi`on` returns true
					return true;`
					`				}
			}
		});
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HotMessSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class grpModal extends Modal {
	message: string;

	constructor(app:App, message: string) {
		super(app);
		this.message = message;
	}

	onOpen(){
		this.display();
	}

	display(): void {
		const { contentEl } = this;
		// contentEl.empty();
		// contentEl.setText(this.message);
		contentEl.createEl("h1", {text: this.message})
		contentEl.createEl('p', {text: "Garbage Out"})
	}

	onClose(){
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Butter');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class HotMessSettingTab extends PluginSettingTab {
	plugin: HotMessPlugin;

	constructor(app: App, plugin: HotMessPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Youtube API Key')
			.addText(text => text
				.setPlaceholder('API Key')
				.setValue(this.plugin.settings.APIKey)
				.onChange(async (value) => {
					this.plugin.settings.APIKey = value;
					await this.plugin.saveSettings();
				})
			);

	}
}