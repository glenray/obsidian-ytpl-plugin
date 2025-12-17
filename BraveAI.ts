import { requestUrl } from 'obsidian';

interface YouTubePlaylistItem {
    id: string;
    title: string;
    description: string;
    videoId: string;
    publishedAt: string;
    thumbnails: {
        default: string;
        medium: string;
        high: string;
    };
}

interface PlaylistData {
    playlistTitle: string;
    playlistDescription: string;
    itemCount: number;
    items: YouTubePlaylistItem[];
}

async function getYouTubePlaylistData(
    playlistId: string, 
    apiKey: string,
    maxResults: number = 50 // Items per page (max 50 for YouTube API)
): Promise<PlaylistData> {
    try {
        // Fetch playlist details
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
        const playlistResponse = await requestUrl({ url: playlistUrl });
        const playlistInfo = playlistResponse.json.items.snippet;

        // Fetch all playlist items with pagination
        const items: YouTubePlaylistItem[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
            const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            
            const itemsResponse = await requestUrl({ url: itemsUrl });
            const data = itemsResponse.json;

            // Process current page items
            const pageItems: YouTubePlaylistItem[] = data.items.map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                videoId: item.snippet.resourceId.videoId,
                publishedAt: item.snippet.publishedAt,
                thumbnails: {
                    default: item.snippet.thumbnails.default.url,
                    medium: item.snippet.thumbnails.medium.url,
                    high: item.snippet.thumbnails.high.url
                }
            }));

            items.push(...pageItems);

            // Get next page token
            nextPageToken = data.nextPageToken;

        } while (nextPageToken);

        return {
            playlistTitle: playlistInfo.title,
            playlistDescription: playlistInfo.description,
            itemCount: items.length,
            items
        };
    } catch (error) {
        console.error('Error fetching YouTube playlist:', error);
        throw error;
    }
}

// Optional: Add progress callback for large playlists
async function getYouTubePlaylistDataWithProgress(
    playlistId: string, 
    apiKey: string,
    onProgress?: (current: number, total: number) => void,
    maxResults: number = 50
): Promise<PlaylistData> {
    try {
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`;
        const playlistResponse = await requestUrl({ url: playlistUrl });
        const playlistInfo = playlistResponse.json.items;
        const totalItems = playlistInfo.contentDetails.itemCount;

        const items: YouTubePlaylistItem[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
            const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            
            const itemsResponse = await requestUrl({ url: itemsUrl });
            const data = itemsResponse.json;

            const pageItems: YouTubePlaylistItem[] = data.items.map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                videoId: item.snippet.resourceId.videoId,
                publishedAt: item.snippet.publishedAt,
                thumbnails: {
                    default: item.snippet.thumbnails.default.url,
                    medium: item.snippet.thumbnails.medium.url,
                    high: item.snippet.thumbnails.high.url
                }
            }));

            items.push(...pageItems);

            // Report progress
            if (onProgress) {
                onProgress(items.length, totalItems);
            }

            nextPageToken = data.nextPageToken;

        } while (nextPageToken);

        return {
            playlistTitle: playlistInfo.snippet.title,
            playlistDescription: playlistInfo.snippet.description,
            itemCount: items.length,
            items
        };
    } catch (error) {
        console.error('Error fetching YouTube playlist:', error);
        throw error;
    }
}