# Note Reviewer Plugin 

This plugin is designed to help retain knowledge by filtering and fetching notes based on Tags.

### To Use

Once enabled, this plugin will create an icon on the Obsidian side bar. Click the Note Reviewer icon to review your notes.

When you have finished reviewing your note, select the done checkbox on that note to mark it as reviewed. 

### Tags

The plugin supports two tag formats for grouping and filtering your notes:

#### New Format (Recommended): YAML Frontmatter
Add tags to your note's YAML frontmatter header:

```yaml
---
tag: [tag1, tag2, tag3]
---
```

Or using YAML list format:
```yaml
---
tag:
  - tag1
  - tag2
  - tag3
---
```

#### Legacy Format (Still Supported)
For backward compatibility, you can still use the old format in the first **10 lines** of your note:

```
Tags: [[Tag 1]] | [[Tag 2]]
```

### Tag Detection
- **YAML frontmatter** is checked first and takes priority
- **Legacy format** is used as a fallback if no YAML frontmatter is found
- Tags are automatically detected and available in the `Filter` dropdown from the Notification Dashboard

