// Simple test to verify tag extraction logic
// This can be run with Node.js to test the regex patterns

// Mock the extractTagsFromYamlFrontmatter function
function extractTagsFromYamlFrontmatter(content) {
    const tags = [];
    
    // Match YAML frontmatter between --- markers (allow newline or end of string after ---)
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
    if (!frontmatterMatch) {
        return tags;
    }

    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');
    
    let inTagsSection = false;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // DEBUG: print each line
        console.log('YAML line:', JSON.stringify(line));
        
        // Check if we're entering the tags section
        if (trimmedLine === 'tags:' || trimmedLine.startsWith('tags:')) {
            inTagsSection = true;
            console.log('Entered tags section');
            
            // Handle inline tags format: tags: [tag1, tag2] or tags: tag1, tag2
            const inlineMatch = line.match(/tags:\s*(.+)/);
            if (inlineMatch) {
                const tagString = inlineMatch[1].trim();
                // Handle array format [tag1, tag2]
                if (tagString.startsWith('[') && tagString.endsWith(']')) {
                    const tagsInBrackets = tagString.slice(1, -1);
                    const tagList = tagsInBrackets.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
                    tags.push(...tagList.filter(tag => tag.length > 0));
                } else if (tagString && !tagString.startsWith('-')) {
                    // Handle comma-separated format (but not multi-line array)
                    const tagList = tagString.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
                    tags.push(...tagList.filter(tag => tag.length > 0));
                }
            }
            // If no inline tags, continue to look for multi-line format
            continue;
        }
        
        // If we're in the tags section, look for tag entries
        if (inTagsSection) {
            // Only break if the line is not empty and does not start with a dash (possibly with whitespace)
            if (trimmedLine && !/^[-\s]/.test(trimmedLine)) {
                inTagsSection = false;
                break;
            }
            
            // DEBUG: print when checking for tag entry
            console.log('Checking for tag entry:', JSON.stringify(trimmedLine));
            
            // Extract tag from line like "  - TODO" or "  - tag-name"
            const tagMatch = trimmedLine.match(/^\s*-\s*(.+)$/);
            if (tagMatch) {
                const tag = tagMatch[1].trim().replace(/['"]/g, '');
                if (tag.length > 0) {
                    tags.push(tag);
                }
            }
        }
    }
    
    return tags;
}

// Mock the legacy tag extraction function
function extractTagsFromLegacy(content) {
    const lines = content.split('\n').slice(0, 10);
    const tagPattern = /Tags:\s*((\[\[.*?\]\]\s*\|?\s*)+)/;
    const tagExtractPattern = /\[\[(.*?)\]\]/g;
    const tags = [];

    for (const line of lines) {
        const match = line.match(tagPattern);
        if (match) {
            let tagMatch;
            while ((tagMatch = tagExtractPattern.exec(match[1])) !== null) {
                tags.push(tagMatch[1]);
            }
            break;
        }
    }

    return tags;
}

// Test cases
const testCases = [
    {
        name: "YAML frontmatter with array format",
        content: `---
id: Add Images
aliases: []
tags:
  - TODO
  - important
  - project
---

# Content here`,
        expected: ["TODO", "important", "project"]
    },
    {
        name: "YAML frontmatter with inline array",
        content: `---
id: Test Note
tags: [TODO, important, project]
---

# Content here`,
        expected: ["TODO", "important", "project"]
    },
    {
        name: "Legacy format",
        content: `# Title

Tags: [[TODO]] | [[important]] | [[project]]

Content here`,
        expected: ["TODO", "important", "project"]
    },
    {
        name: "No tags",
        content: `# Title

Content here with no tags`,
        expected: []
    }
];

// Run tests
console.log("Testing tag extraction logic...\n");

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    
    // Try YAML first
    const yamlTags = extractTagsFromYamlFrontmatter(testCase.content);
    const legacyTags = extractTagsFromLegacy(testCase.content);
    
    const result = yamlTags.length > 0 ? yamlTags : legacyTags;
    
    const passed = JSON.stringify(result.sort()) === JSON.stringify(testCase.expected.sort());
    
    console.log(`  Expected: [${testCase.expected.join(', ')}]`);
    console.log(`  Got:      [${result.join(', ')}]`);
    console.log(`  Status:   ${passed ? 'PASS' : 'FAIL'}`);
    console.log('');
});

console.log("Test completed!"); 