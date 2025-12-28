// The template for the playlist note
export const playlistTemplate = (playlistData) => `---
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
A silly change

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
        - type == "youtube-video"
    order:
      - file.name
      - Completed
    columnSize:
      file.name: 532
\`\`\`

## Links

- [View on YouTube](${playlistData.playlistUrl})

## Notes


`;


// The template for each video note
export const videoNoteTemplate = (playlistData, video, sanitizeFileName) => `---
type: youtube-video
title: ${escapeYamlValue(video.title)}
video_id: ${video.videoId}
url: https://www.youtube.com/watch?v=${video.videoId}
playlist: ${escapeYamlValue(playlistData.title)}
playlist_url: ${playlistData.playlistUrl}
position: ${video.position}
published: ${video.publishedAt}
created: ${new Date().toISOString()}
Completed: false
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

// Escape property values that might break the metadata
function escapeYamlValue(value: any): string {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return 'null';
  }
  
  // Handle booleans and numbers
  if (typeof value === 'boolean' || typeof value === 'number') {
  return value.toString();
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
  return `[${value.map(v => escapeYamlValue(v)).join(', ')}]`;
  }
  
  // Convert to string
  if (typeof value !== 'string') {
  value = String(value);
  }
  
  const trimmed = value.trim();
  
  // Check if quoting is needed
  const needsQuoting = (
  trimmed === '' ||
  /[:\-\[\]{}#&*!|>'"%@`]/.test(trimmed) ||
  /^[\-?:,\[\]{}#&*!|>'"%@`]/.test(trimmed) ||
  /^(true|false|yes|no|on|off|null|~)$/i.test(trimmed) ||
  /^[0-9]/.test(trimmed) ||
  /:\s/.test(trimmed) ||
  trimmed !== value
  );
  
  if (!needsQuoting) {
  return trimmed;
  }
  
  // Escape and quote
  const escaped = trimmed
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r')
  .replace(/\t/g, '\\t');
  
  return `"${escaped}"`;
}
