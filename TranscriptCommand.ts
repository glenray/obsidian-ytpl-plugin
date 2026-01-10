// transcriptCommand.ts - New file for transcript processing
import { Plugin } from 'obsidian';

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
			const transcript = await navigator.clipboard.readText();
			if (!transcript) {
				new Notice('Clipboard is empty');
				return;
			}

			// Get active note content
			const noteContent = editor.getValue();

			// Find YouTube URL
			const videoUrl = this.extractYouTubeUrl(noteContent);
			if (!videoUrl) {
				new Notice('No YouTube URL found in the active note');
				return;
			}

			// Extract video ID from URL
			const videoId = this.extractVideoId(videoUrl);
			if (!videoId) {
				new Notice('Could not extract video ID from URL');
				return;
			}

			// Process transcript
			const processedTranscript = this.processTranscript(transcript, videoUrl, videoId);
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

	private extractYouTubeUrl(content: string): string | null {
		const regex = /https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g;
		const matches = content.match(regex);

		if (!matches || matches.length === 0) {
			return null;
		}

		if (matches.length > 1) {
			new Notice('Multiple YouTube URLs found in the note. Please keep only one.');
			return null;
		}

		return matches;
	}

	private extractVideoId(url: string): string | null {
		const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
		return match ? match : null;
	}

	private timeToSeconds(timeString: string): number {
		const parts = timeString.split(':').map(Number);
		
		if (parts.length === 2) {
			return parts * 60 + parts;
		} else if (parts.length === 3) {
			return parts * 3600 + parts * 60 + parts;
		}
		
		return 0;
	}

	private processTranscript(transcript: string, videoUrl: string, videoId: string): string | null {
		const timestampRegex = /\((\d{1,2}):(\d{2}):(\d{2})|(\d{1,2}):(\d{2}))\)/g;
		
		let hasTimestamps = false;
		let processedTranscript = transcript;

		processedTranscript = processedTranscript.replace(timestampRegex, (match, hh, mm1, ss1, mm2, ss2) => {
			hasTimestamps = true;
			
			let timeString: string;
			let seconds: number;

			if (hh !== undefined) {
				timeString = `${hh}:${mm1}:${ss1}`;
				seconds = this.timeToSeconds(timeString);
			} else {
				timeString = `${mm2}:${ss2}`;
				seconds = this.timeToSeconds(timeString);
			}

			return `([${timeString}](${videoUrl}&t=${seconds}#t=${timeString}.50))`;
		});

		return hasTimestamps ? processedTranscript : null;
	}
}