#!/bin/bash

# Development sync script for Note Reviewer plugin
# This script copies the latest build to the Obsidian plugin directory

OBSIDIAN_PLUGIN_DIR="/Users/travislinkey/Documents/Obsidian/Travis/obsidian/.obsidian/plugins/note-reviewer"
PROJECT_DIR="/Users/travislinkey/Projects/Personal/workspace/note-reviewer"

echo "🔄 Syncing Note Reviewer plugin to Obsidian..."
echo "From: $PROJECT_DIR"
echo "To: $OBSIDIAN_PLUGIN_DIR"

# Copy the latest build files
cp "$PROJECT_DIR/main.js" "$OBSIDIAN_PLUGIN_DIR/main.js"
cp "$PROJECT_DIR/manifest.json" "$OBSIDIAN_PLUGIN_DIR/manifest.json"
cp "$PROJECT_DIR/styles.css" "$OBSIDIAN_PLUGIN_DIR/styles.css"

echo "✅ Sync complete! Files updated:"
echo "   - main.js"
echo "   - manifest.json"
echo "   - styles.css"
echo ""
echo "💡 Remember to reload Obsidian (Ctrl+R) to see changes!" 