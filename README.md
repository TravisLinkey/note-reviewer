# Note Reviewer Plugin 

This plugin is designed to help retain knowledge by filtering and fetching notes based on Tags.

### To Use

Once enabled, this plugin will create an icon on the Obsidian side bar. Click the Note Reviewer icon to review your notes.

When you have finished reviewing your note, select the done checkbox on that note to mark it as reviewed. 

### Tags

The plugin supports two formats for tagging your notes:

#### New Format (Recommended)
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

#### Legacy Format (Still Supported)
Include the following snippet somewhere in the top **10 lines** of your note:

```
Tags: [[Tag 1]] | [[Tag 2]]
```

### Tag Format Support

The plugin automatically detects and supports both tag formats:
- **YAML Frontmatter**: The new standard format using YAML frontmatter with a `tags` array
- **Legacy Format**: The old format using `Tags: [[tag]]` syntax in the first 10 lines

The plugin will first try to extract tags from YAML frontmatter, and if none are found, it will fall back to the legacy format for backward compatibility.

This will automatically be detected by the plugin and allow searching your note via the `Filter` dropdown from the Notification Dashboard.

