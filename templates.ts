export const playlistTemplate = (playlistData, escapeYamlValue) => `---
type: youtube-playlist
title: ${escapeYamlValue(playlistData.title)}
playlist_id: ${playlistData.playlistId}
url: ${playlistData.playlistUrl}
channel: ${escapeYamlValue(playlistData.channelTitle)}
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

\`\`\`base
views:
  - type: table
    name: Videos
    filters:
      and:
        - file.folder == this.file.folder
        - file.name != this.file.name
\`\`\`

## Links

- [View on YouTube](${playlistData.playlistUrl})

## Notes


`;

export const videoNoteTemplate = (playlistData, video, escapeYamlValue, sanitizeFileName) => `---
type: youtube-video
title: ${escapeYamlValue(video.title)}
video_id: ${video.videoId}
url: https://www.youtube.com/watch?v=${video.videoId}
playlist: ${escapeYamlValue(playlistData.title)}
playlist_url: ${playlistData.playlistUrl}
position: ${video.position}
published: ${video.publishedAt}
created: ${new Date().toISOString()}
---

# ${video.title}

**Position in Playlist:** ${video.position} of ${playlistData.itemCount}
**Playlist:** [[${sanitizeFileName(`${playlistData.title} - ${playlistData.channelTitle}`)}|${playlistData.title}]]
**Channel:** ${playlistData.channelTitle}
**Published:** ${new Date(video.publishedAt).toLocaleDateString()}

## Video URL

https://www.youtube.com/watch?v=${video.videoId}

## Description

${video.description || 'No description available'}

## Notes

<!-- Add your notes here -->

---

**Navigation:**
${video.position > 1 ? `← Previous: [[${String(video.position - 1).padStart(2, '0')} - ${sanitizeFileName(playlistData.videos[video.position - 2]?.title)}]]` : ''}
${video.position < playlistData.itemCount ? `Next: [[${String(video.position + 1).padStart(2, '0')} - ${sanitizeFileName(playlistData.videos[video.position]?.title)}]] →` : ''}

`;