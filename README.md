# Note Reviewer Plugin 

This plugin is designed to help retain knowledge by filtering and fetching notes based on Tags.

### To Use

Once enabled, this plugin will create an icon on the Obsidian side bar. Click the Note Reviewer icon to review your notes.

When you have finished reviewing your note, select the done checkbox on that note to mark it as reviewed. 

### Tags

The plugin supports YAML frontmatter format for tagging your notes:

#### YAML Frontmatter Format
Use YAML frontmatter at the top of your note:

```yaml
---
id: Add Images
aliases: []
tags:
  - TODO
  - important
  - project
---
```

This will automatically be detected by the plugin and allow searching your note via the `Filter` dropdown from the Notification Dashboard.

