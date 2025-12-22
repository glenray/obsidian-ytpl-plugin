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
			// the callback function automatically gets the editor and markdown view parameters. I also want it to get the APIKey. This is how we pass it the additional parameter.
			editorCallback: (Editor, MarkdownView) => reqYoutubePL(Editor, MarkdownView, this.settings)
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

	private getDirectories(): string[] {
		const directories: string[] = ['/']; //Root directory
		const vault = this.app.vault;

		const traverse = (folder: any) => {
			if (folder.children){
				folder.children.forEach((child:any) => {
					if(child.children){ // It's a folder
						directories.push(child.path);
						traverse(child);
					}
				});
			}
		};
		traverse(vault.getRoot());
		return directories.sort();
	}
}