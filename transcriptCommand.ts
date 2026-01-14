// Hot mess plugin command to add clickable time stamps to the unclickable timestamps
// provided by the YouTube Transcript browser extension.
// Glen Pritchard - 2026-01-10

import { Plugin, Notice } from 'obsidian';

export class TranscriptCommand {
	private plugin: Plugin;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	public async init(): Promise<void> {
		// Add the new command to the plugin
		this.plugin.addCommand({
			id: 'paste-youtube-transcript',
			name: 'Paste YouTube Transcript with Timestamps',
			editorCallback: (editor: any, view: any) => {
				this.pasteTranscriptWithTimestamps(editor, view);
			}
		});
	}

	private async pasteTranscriptWithTimestamps(editor: any, view: any): Promise<void> {
		try {
			// Get clipboard content
			const clipboardContent = await navigator.clipboard.readText();
			if (!clipboardContent) {
				new Notice('Clipboard is empty');
				return;
			}

			// Find YouTube URL in clipboard
			const videoUrl = this.extractYouTubeUrl(clipboardContent);
			if (!videoUrl) {
				new Notice('No YouTube URL found in clipboard');
				return;
			}

			// Extract video ID from URL
			const videoId = this.extractVideoId(videoUrl[0]);
			if (!videoId) {
				new Notice('Could not extract video ID from URL');
				return;
			}

			// Process transcript
			const processedTranscript = this.processTranscript(clipboardContent, videoUrl, videoId);
			if (!processedTranscript) {
				new Notice('No timestamps found in the transcript');
				return;
			}

			// Insert at cursor position
			editor.replaceSelection(processedTranscript);
			new Notice('Transcript inserted successfully');

		} catch (error) {
			new Notice(`Error: ${error.message}`);
		}
	}

	private extractYouTubeUrl(content: string): any | null {
		const regex = /https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g;
		const matches = content.match(regex);

		console.log(typeof(matches))

		if (!matches || matches.length === 0) {
			return null;
		}

		if (matches.length > 1) {
			new Notice('Multiple YouTube URLs found in clipboard. Please keep only one.');
			return null;
		}

		return matches;
	}

	private extractVideoId(url: string): any | null {
		const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
		return match ? match : null;
	}

	private processTranscript(transcript: string, videoUrl: string, videoId: string): string | null {
		const timestampRegex = /\((\d{1,2}):(\d{2}):(\d{2})\)|\((\d{1,2}):(\d{2})\)/g;
		
		let hasTimestamps = false;
		let processedTranscript = transcript;

		processedTranscript = processedTranscript.replace(timestampRegex, (match, hh, mm1, ss1, mm2, ss2) => {
			
			hasTimestamps = true;
			let timeString: string;

			// 2 possible time formats are 'hh:mm:ss' or 'mm:ss'
			timeString = (hh !== undefined) ? `${hh}:${mm1}:${ss1}` : `${mm2}:${ss2}`

			return `([${timeString}](${videoUrl}&#t=${timeString}))`;
		});

		return hasTimestamps ? processedTranscript : null;
	}
}