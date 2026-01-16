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

	async createVideoNotes(playlistData: YouTubePlaylistData): Promise<{ created: number; skipped: number; isUpdate: boolean }> {
		try {
			const playlistFolderName = this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`);
			const fullPath = `${this.plugin.settings.notesFolder}/${playlistFolderName}`;

			// Check if this is an update (folder already exists)
			const folderExists = this.plugin.app.vault.getAbstractFileByPath(fullPath);
			const isUpdate = !!folderExists;

			await this.ensureFolderExists(fullPath);

			// Get existing video IDs if updating
			const existingVideoIds = isUpdate ? await this.getExistingVideoIds(fullPath) : new Set<string>();

			// Only create playlist note if it doesn't exist
			const playlistNotePath = `${fullPath}/${this.sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`)}.md`;
			const playlistNoteExists = this.plugin.app.vault.getAbstractFileByPath(playlistNotePath);
			if (!playlistNoteExists) {
				await this.createPlaylistNote(fullPath, playlistData);
			}

			let createdCount = 0;
			let skippedCount = 0;

			for (const video of playlistData.videos) {
				if (existingVideoIds.has(video.videoId)) {
					skippedCount++;
					continue;
				}
				await this.createVideoNote(fullPath, video, playlistData);
				createdCount++;
			}

			if (isUpdate) {
				if (createdCount > 0) {
					new Notice(`Added ${createdCount} new video notes (${skippedCount} already existed) in "${fullPath}"`);
				} else {
					new Notice(`Playlist is up to date. All ${skippedCount} videos already have notes.`);
				}
			} else {
				new Notice(`Created playlist note and ${createdCount} video notes in "${fullPath}"`);
			}

			return { created: createdCount, skipped: skippedCount, isUpdate };
		} catch (error) {
			console.error('Error creating video notes:', error);
			throw error;
		}
	}

	private async getExistingVideoIds(folderPath: string): Promise<Set<string>> {
		const videoIds = new Set<string>();
		const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);

		if (!folder || !(folder as any).children) {
			return videoIds;
		}

		const files = (folder as any).children.filter((f: any) => f instanceof TFile && f.extension === 'md');

		for (const file of files) {
			try {
				const content = await this.plugin.app.vault.read(file);
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
				if (frontmatterMatch) {
					const videoIdMatch = frontmatterMatch[1].match(/video_id:\s*(.+)/);
					if (videoIdMatch) {
						videoIds.add(videoIdMatch[1].trim());
					}
				}
			} catch (e) {
				// Skip files that can't be read
			}
		}

		return videoIds;
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
					statusEl.setText(`Found ${playlistData.videos.length} videos. Checking for existing notes...`);
					const result = await playlistCommand.createVideoNotes(playlistData);

					if (result.isUpdate) {
						if (result.created > 0) {
							new Notice(`Added ${result.created} new videos to "${playlistData.title}"`);
						} else {
							new Notice(`"${playlistData.title}" is already up to date`);
						}
					} else {
						new Notice(`Successfully created notes for "${playlistData.title}"`);
					}
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