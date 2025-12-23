interface ytPlVideo {
	vidLink: string,
	vidId: string,
	vidSeq: number,
	vidDesc: string,
	vidTitle: string,
	channelTitle: string
}

export async function getPlaylistVideos(plId, apiKey){
	const playlistItemsURL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${plId}&maxResults=50&key=${apiKey}`;
	const plVidReq = await requestUrl({url:playlistItemsURL});
	const plItemInfo = plVidReq.json.items;
	const vidArray = [];
	for (const obj of plItemInfo){
		const playList: ytPlVideo = {
			vidLink: `[${obj.snippet.title}](https://www.youtube.com/watch?v=${obj.snippet.resourceId.videoId})`,
			vidId: obj.snippet.resourceId.videoId,
			vidSeq: obj.snippet.position+1,
			vidDesc: obj.snippet.description,
			vidTitle: obj.snippet.title,
			channelTitle: obj.snippet.channelTitle
		}
		vidArray.push(playList);
	}

	const playlistURL = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${plId}&key=${apiKey}`;
	const plData = await requestUrl({url:playlistURL});
	plInfo = plData.json.items[0];
	return {
		playListVideosInfo: vidArray,
		playListInfo: plInfo
	};
}

export async function reqYoutubePL(
	editor: Editor, 
	view: MarkdownView, 
	that){
	// const url = await that.app.workspace.activeLeaf.view.prompt({
	// 	title: "Enter Youtube Playlist URL",
	// 	placeholder: "https://example.com"
	// });
	const plId = "PL3NaIVgSlAVIDaYB0yeH3lnB9CZ0Hp_xs";
	const plData = await getPlaylistVideos(plId, that.settings.APIKey);
	console.log(plData);
}


function sanitizeFileName(fileName) {
    // Remove illegal characters: \ / : * ? " < > |
    return fileName.replace(/[\\/:*?"<>|]/g, '');
}
