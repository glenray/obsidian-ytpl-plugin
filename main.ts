/*
12/23/2025: This was originally built by Brave AI automatic: 
brave://leo-ai/102f7cd9-6c60-4b32-ac21-99b12fcb3e27 
*/

import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TranscriptCommand } from './transcriptCommand';
import { PlaylistCommand } from './playlistCommand';

interface PluginSettings {
	apiKey: string;
	lastPlaylistUrl: string;
	notesFolder: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	apiKey: '',
	lastPlaylistUrl: '',
	notesFolder: 'YouTube Playlists'
};

export default class YouTubePlaylistPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		const transcriptCommand = new TranscriptCommand(this);
		await transcriptCommand.init();

		const playlistCommand = new PlaylistCommand(this);
		playlistCommand.init();

		this.addSettingTab(new YouTubePlaylistSettingsTab(this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class YouTubePlaylistSettingsTab extends PluginSettingTab {
	plugin: YouTubePlaylistPlugin;

	constructor(plugin: YouTubePlaylistPlugin) {
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
			.setName('Notes Folder')
			.setDesc('Folder where playlist notes will be created')
			.addText(text => text
				.setPlaceholder('YouTube Playlists')
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

		containerEl.createEl('h3', { text: 'How to get a YouTube API Key' });
		containerEl.createEl('ol', {}, (ol) => {
			ol.createEl('li', { text: 'Go to Google Cloud Console (console.cloud.google.com)' });
			ol.createEl('li', { text: 'Create a new project or select an existing one' });
			ol.createEl('li', { text: 'Enable the YouTube Data API v3' });
			ol.createEl('li', { text: 'Go to Credentials and create an API key' });
			ol.createEl('li', { text: 'Copy the API key and paste it above' });
		});
	}
}