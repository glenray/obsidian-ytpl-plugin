export async function getPlaylistVideos(plId, apiKey): Promise<playlistInfo>{
	const playlistURL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${plId}&maxResults=50&key=${apiKey}`;
	const response = await requestUrl({url:playlistURL});
	const playlistInfo = response.json.items;
	return playlistInfo;
}

export async function reqYoutubePL(editor: Editor, view: MarkdownView, settings){
	const plId = "PL3NaIVgSlAVIDaYB0yeH3lnB9CZ0Hp_xs";
	const plData = await getPlaylistVideos(plId, settings.APIKey);
	for (const obj of plData){
		console.log(`[${obj.snippet.title}](https://www.youtube.com/watch?v=${obj.snippet.resourceId.videoId})`);
	}
}


function sanitizeFileName(fileName) {
    // Remove illegal characters: \ / : * ? " < > |
    return fileName.replace(/[\\/:*?"<>|]/g, '');
}
