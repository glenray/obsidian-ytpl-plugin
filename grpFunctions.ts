export async function getPlaylistVideos(plId, apiKey): Promise<playlistInfo>{
	const playlistURL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${plId}&maxResults=50&key=${apiKey}`;
	const response = await requestUrl({url:playlistURL});
	const playlistInfo = response.json.items;
	return playlistInfo;
}

