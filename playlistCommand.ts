import { App, Modal, Notice, TFile } from 'obsidian';
import type YouTubePlaylistPlugin from './main';
import { playlistTemplate, videoNoteTemplate } from './templates';

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

export class PlaylistCommand {
	constructor(private plugin: YouTubePlaylistPlugin) {}

	init() {
		this.plugin.addCommand({
			id: 'fetch-youtube-playlist',
			name: 'Fetch YouTube Playlist',
			callback: () => {
				new PlaylistModal(this.plugin.app, this.plugin).open();
			}
		});
	}

	async fetchPlaylistMetadata(playlistUrl: string): Promise<YouTubePlaylistData | null> {
		try {
			const playlistId = this.extractPlaylistId(playlistUrl);
			if (!playlistId) {
				throw new Error('Invalid YouTube playlist URL');
			}

			if (!this.plugin.settings.apiKey) {
				throw new Error('YouTube API key not configured. Please add it in settings.');
			}

			const playlistResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${this.plugin.settings.apiKey}`
			);

			if (!playlistResponse.ok) {
				throw new Error(`API Error: ${playlistResponse.statusText}`);
			}

			const playlistData = await playlistResponse.json();

			if (!playlistData.items || playlistData.items.length === 0) {
				throw new Error('Playlist not found');
			}

			const playlist = playlistData.items[0];
			const itemCount = playlist.contentDetails.itemCount;

			const videos: YouTubeVideo[] = [];
			let nextPageToken = '';
			
			do {
				const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${this.plugin.settings.apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
				
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
					position: item.snippet.position + 1
				}));

				videos.push(...pageVideos);
				nextPageToken = itemsData.nextPageToken || '';
			} while (nextPageToken);

			return {
				playlistId: playlistId,
				title: playlist.snippet.title,
				description: playlist.snippet.description,
				channelTitle: playlist.snippet.channelTitle,
				itemCount: itemCount,
				thumbnailUrl: playlist.snippet.thumbnails.default.url,
				playlistUrl: playlistUrl,
				videos: videos
			};
		} catch (error) {
			console.error('Error fetching playlist:', error);
			throw error;
		}
	}

	async createVideoNotes(playlistData: YouTubePlaylistData): Promise<void> {
		try {
			const playlistFolderName = this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`);
			const fullPath = `${this.plugin.settings.notesFolder}/${playlistFolderName}`;
			
			await this.ensureFolderExists(fullPath);
			await this.createPlaylistNote(fullPath, playlistData);

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

	private async createPlaylistNote(folderPath: string, playlistData: YouTubePlaylistData): Promise<void> {
		const fileName = `${folderPath}/${this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`)}.md`;
		const content = playlistTemplate(playlistData);
		await this.plugin.app.vault.create(fileName, content);
		
		const file = this.plugin.app.vault.getAbstractFileByPath(fileName);
		if (file && file instanceof TFile) {
			const leaf = this.plugin.app.workspace.getLeaf('tab');
			leaf.openFile(file);
		}
	}

	private async createVideoNote(
		folderPath: string, 
		video: YouTubeVideo, 
		playlistData: YouTubePlaylistData
	): Promise<void> {
		const fileName = `${folderPath}/${String(video.position).padStart(2, '0')} - ${this.sanitizeFileName(video.title)}.md`;
		const content = videoNoteTemplate(playlistData, video, this.sanitizeFileName.bind(this));
		await this.plugin.app.vault.create(fileName, content);
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folders = folderPath.split('/');
		let currentPath = '';

		for (const folder of folders) {
			currentPath = currentPath ? `${currentPath}/${folder}` : folder;
			
			const exists = this.plugin.app.vault.getAbstractFileByPath(currentPath);
			if (!exists) {
				await this.plugin.app.vault.createFolder(currentPath);
			}
		}
	}

	private sanitizeFileName(name: string): string {
		return name
			.replace(/[\\/:|]/g, '-')
			.replace(/[\[<{]/g , '(')
			.replace(/[\]>}]/g , ')')
			.replace(/[#]/g, 'no ')
			.replace(/[?*^]/g, '')
			.replace(/["]/g, "'")
			.replace(/\s+/g, ' ')
			.trim()
			.substring(0, 200);
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

				const playlistCommand = new PlaylistCommand(this.plugin);
				const playlistData = await playlistCommand.fetchPlaylistMetadata(url);
				
				if (playlistData) {
					statusEl.setText(`Found ${playlistData.videos.length} videos. Creating notes...`);
					await playlistCommand.createVideoNotes(playlistData);
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