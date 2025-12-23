import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {getPlaylistVideos, reqYoutubePL} from './grpFunctions';

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

		// GRP - Request to Youtube url
		this.addCommand({
			id: 'request-youtube-pl',
			name: 'Request Youtube Playlist',
			// the callback function automatically gets the editor and markdown view parameters. I also want it to get the APIKey. This is how we pass it the additional parameter.
			editorCallback: (Editor, MarkdownView) => reqYoutubePL(Editor, MarkdownView, this)
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HotMessSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

		new Setting(containerEl)
			.setName('Video Folder')
			.setDesc('Select folder for videos')
			.addDropdown(dropdown => {
				const directories = this.getDirectories();

				directories.forEach((dir) => {
					dropdown.addOption(dir, dir);
				});

				dropdown
					.setValue(this.plugin.settings.videoFolder || '')
					.onChange(async (value) => {
						console.log(this.plugin.settings);
						this.plugin.settings.videoFolder = value;
						await this.plugin.saveSettings();
					});
			});
	}
}