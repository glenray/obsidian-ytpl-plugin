/*
12/23/2025: This was originally built by Brave AI automatic: 
brave://leo-ai/102f7cd9-6c60-4b32-ac21-99b12fcb3e27 
*/

import { AbstractInputSuggest, App, Plugin, PluginSettingTab, Setting, TFolder } from 'obsidian';
import { TranscriptCommand } from './transcriptCommand';
import { PlaylistCommand } from './playlistCommand';

interface PluginSettings {
	apiKey: string;
	lastPlaylistUrl: string;
	notesFolder: string;
	test: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	apiKey: '',
	lastPlaylistUrl: '',
	notesFolder: '',
	test: ''
};

export default class GHM extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		const transcriptCommand = new TranscriptCommand(this);
		await transcriptCommand.init();

		const playlistCommand = new PlaylistCommand(this);
		playlistCommand.init();

		this.addSettingTab(new GHMSettingsTab(this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class GHMSettingsTab extends PluginSettingTab {
	plugin: GHM;
	constructor(plugin: GHM) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'YouTube Playlist Plugin Settings' });

		new Setting(containerEl)
			.setName('YouTube API Key')
			.setDesc('Enter your YouTube Data API v3 key. Get one from Google Cloud Console.')
			.addText(text => text
				.setPlaceholder('AIzaSy...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Playlist Folder')
			.setDesc('Folder where playlist notes will be created')
			.addText(text => text
				.setPlaceholder('Folder')
				.setValue(this.plugin.settings.notesFolder)
				.onChange(async (value) => {
					this.plugin.settings.notesFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Last Playlist URL')
			.setDesc('The last playlist URL you fetched')
			.addText(text => text
				.setValue(this.plugin.settings.lastPlaylistUrl)
				.setDisabled(true));


		new Setting(containerEl)
			.setName('Test Folder Suggester')
			.setDesc('Just a test')
			.addText(text => {
				text.inputEl.placeholder = "Type to suggest ...";
				text.inputEl.value = this.plugin.settings.test;
				const folderList = this.getFolders();
				new CustomSuggester(this.app, text.inputEl, folderList, async (value) => {
					this.plugin.settings.test = value;
					await this.plugin.saveSettings();

				});
			});

		containerEl.createEl('h3', { text: 'How to get a YouTube API Key' });
		containerEl.createEl('ol', {}, (ol) => {
			ol.createEl('li', { text: 'Go to Google Cloud Console (console.cloud.google.com)' });
			ol.createEl('li', { text: 'Create a new project or select an existing one' });
			ol.createEl('li', { text: 'Enable the YouTube Data API v3' });
			ol.createEl('li', { text: 'Go to Credentials and create an API key' });
			ol.createEl('li', { text: 'Copy the API key and paste it above' });
		});
	}

	getFolders(){
		let options = []; 
		const allFiles = app.vault.getAllLoadedFiles();
		const folders = allFiles.filter(file => file instanceof TFolder);
		
		folders.forEach(folder => {
			options.push(folder.path);
		});
		return options;
	}
}



export class CustomSuggester extends AbstractInputSuggest<string> {
	private options: string[];
	private onSelect: (value: string) => void;

	constructor(app: App, inputEl: HTMLInputElement, options: string[], onSelect: (value: string) => void) {
		super(app, inputEl);
		this.options = options;
		this.onSelect = onSelect;
		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): string[] {
		const lowerInput = inputStr.toLowerCase();
		return this.options.filter(opt => opt.toLowerCase().includes(lowerInput));
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.onSelect(value);
		this.inputEl.value = value;
		this.close();
	}
}

