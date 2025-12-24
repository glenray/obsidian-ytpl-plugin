/*
12/23/2025: This was originally built by Brave AI automatic: 
brave://leo-ai/102f7cd9-6c60-4b32-ac21-99b12fcb3e27 
*/

import { App, Modal, Plugin, PluginSettingTab, Setting, Notice, TFolder } from 'obsidian';

interface YouTubePlaylistData {
	playlistId: string;
	title: string;
	description: string;
	channelTitle: string;
	itemCount: number;
	thumbnailUrl: string;
	playlistUrl: string;
	videos: YouTubeVideo[];
}

interface YouTubeVideo {
	title: string;
	videoId: string;
	publishedAt: string;
	description: string;
	position: number;
}

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

		this.addCommand({
			id: 'fetch-youtube-playlist',
			name: 'Fetch YouTube Playlist',
			callback: () => {
				new PlaylistModal(this.app, this).open();
			}
		});

		this.addSettingTab(new YouTubePlaylistSettingsTab(this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchPlaylistMetadata(playlistUrl: string): Promise<YouTubePlaylistData | null> {
		try {
			// Extract playlist ID from URL
			const playlistId = this.extractPlaylistId(playlistUrl);
			if (!playlistId) {
				throw new Error('Invalid YouTube playlist URL');
			}

			if (!this.settings.apiKey) {
				throw new Error('YouTube API key not configured. Please add it in settings.');
			}

			// Fetch playlist details
			const playlistResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${this.settings.apiKey}`
			);

			if (!playlistResponse.ok) {
				throw new Error(`API Error: ${playlistResponse.statusText}`);
			}

			const playlistData = await playlistResponse.json();

			if (!playlistData.items || playlistData.items.length === 0) {
				throw new Error('Playlist not found');
			}

			const playlist = playlistData.items;
			const itemCount = playlist[0].contentDetails.itemCount;

			// Fetch all playlist items (videos) - handle pagination
			const videos: YouTubeVideo[] = [];
			let nextPageToken = '';
			
			do {
				const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${this.settings.apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
				
				const itemsResponse = await fetch(itemsUrl);

				if (!itemsResponse.ok) {
					throw new Error(`API Error: ${itemsResponse.statusText}`);
				}

				const itemsData = await itemsResponse.json();

				const pageVideos: YouTubeVideo[] = (itemsData.items || []).map((item: any) => ({
					title: item.snippet.title,
					videoId: item.snippet.resourceId.videoId,
					publishedAt: item.snippet.publishedAt,
					description: item.snippet.description,
					position: item.snippet.position + 1 // 1-indexed position
				}));

				videos.push(...pageVideos);
				nextPageToken = itemsData.nextPageToken || '';
			} while (nextPageToken);

			return {
				playlistId: playlistId,
				title: playlist[0].snippet.title,
				description: playlist[0].snippet.description,
				channelTitle: playlist[0].snippet.channelTitle,
				itemCount: itemCount,
				thumbnailUrl: playlist[0].snippet.thumbnails.default.url,
				playlistUrl: playlistUrl,
				videos: videos
			};
		} catch (error) {
			console.error('Error fetching playlist:', error);
			throw error;
		}
	}

	// The playlist metadata has been found and clicking OK button launches this method
	async createVideoNotes(playlistData: YouTubePlaylistData): Promise<void> {
		try {
			// Create folder structure
			const playlistFolderName = this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`);
			const fullPath = `${this.settings.notesFolder}/${playlistFolderName}`;
			
			// Ensure the folder exists
			await this.ensureFolderExists(fullPath);

			// Create main playlist note
			await this.createPlaylistNote(fullPath, playlistData);

			// Create individual notes for each video
			let createdCount = 0;
			for (const video of playlistData.videos) {
				await this.createVideoNote(fullPath, video, playlistData);
				createdCount++;
			}

			new Notice(`Created playlist note and ${createdCount} video notes in "${fullPath}"`);
		} catch (error) {
			console.error('Error creating video notes:', error);
			throw error;
		}
	}

	async createPlaylistNote(folderPath: string, playlistData: YouTubePlaylistData): Promise<void> {
		const fileName = `${folderPath}/${this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`)}.md`;
		
		const content = `---
type: youtube-playlist
title: ${playlistData.title}
playlist_id: ${playlistData.playlistId}
url: ${playlistData.playlistUrl}
channel: ${playlistData.channelTitle}
video_count: ${playlistData.itemCount}
created: ${new Date().toISOString()}
---

# ${playlistData.title}

**Channel:** ${playlistData.channelTitle}
**Total Videos:** ${playlistData.itemCount}
**Playlist URL:** ${playlistData.playlistUrl}

## Description

${playlistData.description || 'No description available'}

## Videos

${playlistData.videos.map(video => 
	`${video.position}. [[${String(video.position).padStart(2, '0')} - ${this.sanitizeFileName(video.title)}|${video.title}]]`
).join('\n')}

## Links

- [View on YouTube](${playlistData.playlistUrl})

## Notes


`;

		await this.app.vault.create(fileName, content);
	}


	async createVideoNote(
		folderPath: string, 
		video: YouTubeVideo, 
		playlistData: YouTubePlaylistData): Promise<void> {
		const fileName = `${folderPath}/${String(video.position).padStart(2, '0')} - ${this.sanitizeFileName(video.title)}.md`;
		const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
		
		const content = `---
type: youtube-video
title: ${video.title}
video_id: ${video.videoId}
url: ${videoUrl}
playlist: ${playlistData.title}
playlist_url: ${playlistData.playlistUrl}
position: ${video.position}
published: ${video.publishedAt}
created: ${new Date().toISOString()}
---

# ${video.title}

**Position in Playlist:** ${video.position} of ${playlistData.itemCount}
**Playlist:** [[${this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`)}|${playlistData.title}]]
**Channel:** ${playlistData.channelTitle}
**Published:** ${new Date(video.publishedAt).toLocaleDateString()}

## Video URL

${videoUrl}

## Description

${video.description || 'No description available'}

## Notes

<!-- Add your notes here -->

---

**Navigation:**
${video.position > 1 ? `← Previous: [[${String(video.position - 1).padStart(2, '0')} - ${this.sanitizeFileName(playlistData.videos[video.position - 2]?.title)}]]` : ''}
${video.position < playlistData.itemCount ? `Next: [[${String(video.position + 1).padStart(2, '0')} - ${this.sanitizeFileName(playlistData.videos[video.position]?.title)}]] →` : ''}

`;

		await this.app.vault.create(fileName, content);
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folders = folderPath.split('/');
		let currentPath = '';

		for (const folder of folders) {
			currentPath = currentPath ? `${currentPath}/${folder}` : folder;
			
			const exists = this.app.vault.getAbstractFileByPath(currentPath);
			if (!exists) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}

	private sanitizeFileName(name: string): string {
		// Remove invalid characters for file names
		return name
			.replace(/[\\/:*?"<>|]/g, '-')
			.replace(/\s+/g, ' ')
			.trim()
			.substring(0, 200); // Limit length
	}

	private extractPlaylistId(url: string): string | null {
		try {
			const urlObj = new URL(url);
			const playlistId = urlObj.searchParams.get('list');
			return playlistId;
		} catch {
			return null;
		}
	}
}

class PlaylistModal extends Modal {
	constructor(app: App, private plugin: YouTubePlaylistPlugin) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'YouTube Playlist Fetcher' });

		const inputEl = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'https://www.youtube.com/playlist?list=PLxxxxxx',
			value: this.plugin.settings.lastPlaylistUrl
		});
		inputEl.style.width = '100%';
		inputEl.style.padding = '8px';
		inputEl.style.marginBottom = '10px';

		const statusEl = contentEl.createEl('div', { text: '' });
		statusEl.style.marginTop = '10px';
		statusEl.style.color = '#888';

		const buttonContainer = contentEl.createEl('div');
		buttonContainer.style.marginTop = '10px';
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';

		const submitBtn = buttonContainer.createEl('button', { text: 'Fetch Playlist' });
		submitBtn.onclick = async () => {
			const url = inputEl.value.trim();
			
			if (!url) {
				new Notice('Please enter a playlist URL');
				return;
			}

			try {
				submitBtn.disabled = true;
				statusEl.setText('Fetching playlist data...');
				
				this.plugin.settings.lastPlaylistUrl = url;
				await this.plugin.saveSettings();

				const playlistData = await this.plugin.fetchPlaylistMetadata(url);
				
				if (playlistData) {
					statusEl.setText(`Found ${playlistData.videos.length} videos. Creating notes...`);
					
					await this.plugin.createVideoNotes(playlistData);
					
					new Notice(`Successfully created notes for "${playlistData.title}"`);
					this.close();
				}
			} catch (error) {
				new Notice(`Error: ${error.message}`);
				statusEl.setText(`Error: ${error.message}`);
				submitBtn.disabled = false;
			}
		};

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.onclick = () => {
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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