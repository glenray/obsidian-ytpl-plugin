# Glen's Hot Mess Plugin

## Command: Fetch YouTube Playlist 

This command prompts the user for a url to a YouTube playlist. A video note is created for each video. A playlist note is also created which lists all of the related videos. The video notes and the playlist notes are all saved in a separate directory making it easy to stay organized. 

A Youtube api key is required.

- Go to Google Cloud Console (console.cloud.google.com)
- Create a new project or select an existing one
- Enable the YouTube Data API v3
- Go to Credentials and create an API key
- Copy the API key and paste it in the settings pane.

## Command: Paste YouTube Transcript with Timestamps

This command is intended to be used in conjuction with the browser extension YouTube Summary & ChatGPT by Glasp. Specifically, the freature allowing the user to copy a video's subtitles as a transcript. When exported into the system clipboard, the transcript can then be pasted into an Obsidian note.

Each line of the transcript starts with a time stamp in the format of '(43:14)', meaning that the transcript text corresponds to 43 minutes and 14 seconds into the video. The problem is that the timestamps are not clickable, i.e. there is no way to jump to that section of the video. This command fixes that problem.

The following procedure must be used to use this command:

- The Glasp extension is installed in you browser.
- You have navigated to a YouTube video page and clicked 'YouTube Summary' dropdown in the Glasp sidebar.
- Click the 'Copy Trascript (plain text)' icon. Now the system clipboard contains the transcript.
- In Obsidian, place the cursor where you want to paste the transcript.
- Running the Paste YouTube Transcript with Timestamps command will paste the transcript into your note with **clickable** timestamps.

This is particularly useful when also using the Obsidian Media Extended plugin which allows you to display the video in Obsidian.