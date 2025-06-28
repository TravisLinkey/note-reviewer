// Simple test to verify tag extraction logic
// This can be run with Node.js to test the regex patterns

// Mock the extractTagsFromYamlFrontmatter function
function extractTagsFromYamlFrontmatter(content) {
    const tags = [];
    
    // More robust regex that handles different line endings and edge cases
    const frontmatterMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
    if (!frontmatterMatch) {
        console.log("No YAML frontmatter found");
        return tags;
    }
    
    console.log("YAML frontmatter found");
    const frontmatter = frontmatterMatch[1];
    console.log("Frontmatter content:", frontmatter);
    const lines = frontmatter.split('\n');
    let inTagsSection = false;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        console.log("Processing line:", JSON.stringify(line));
        
        if (trimmedLine === 'tags:' || trimmedLine.startsWith('tags:')) {
            inTagsSection = true;
            console.log("Entered tags section");
            const inlineMatch = line.match(/tags:\s*(.+)/);
            if (inlineMatch) {
                const tagString = inlineMatch[1].trim();
                console.log("Inline tags found:", tagString);
                if (tagString.startsWith('[') && tagString.endsWith(']')) {
                    const tagsInBrackets = tagString.slice(1, -1);
                    const tagList = tagsInBrackets.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
                    tags.push(...tagList.filter(tag => tag.length > 0));
                } else if (tagString && !tagString.startsWith('-')) {
                    const tagList = tagString.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
                    tags.push(...tagList.filter(tag => tag.length > 0));
                }
            }
            continue;
        }
        if (inTagsSection) {
            if (trimmedLine && !trimmedLine.startsWith(' ') && !trimmedLine.startsWith('\t')) {
                inTagsSection = false;
                console.log("Exited tags section");
                break;
            }
            const tagMatch = trimmedLine.match(/^\s*-\s*(.+)$/);
            if (tagMatch) {
                const tag = tagMatch[1].trim().replace(/['"]/g, '');
                console.log("Found tag:", tag);
                if (tag.length > 0) {
                    tags.push(tag);
                }
            }
        }
    }
    
    console.log("Final tags:", tags);
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

// Test the regex pattern directly
function testRegexPattern() {
    console.log("Testing YAML frontmatter regex pattern...\n");
    
    const regex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/;
    
    const testCases = [
        {
            name: "Jean-Paul Sartre format",
            content: `---
id: Jean-Paul Sartre
aliases:
  - Jean-Paul Sartre
tags:
  - ADR
---

# Jean-Paul Sartre`
        },
        {
            name: "Tailwind CSS format", 
            content: `---
id: Tailwind CSS
aliases: []
tags:
  - ServiceCore
  - ADR
---

# Content here`
        },
        {
            name: "Simple format",
            content: `---
id: Test
tags:
  - tag1
  - tag2
---

# Content`
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.name}`);
        const match = testCase.content.match(regex);
        
        if (match) {
            console.log("  ✅ Regex matched!");
            console.log("  Frontmatter content:", match[1]);
        } else {
            console.log("  ❌ Regex did NOT match!");
            console.log("  Content preview:", testCase.content.substring(0, 200));
        }
        console.log("");
    });
}

// Test the exact content from Jean-Paul Sarte.md
function testExactFile() {
    console.log("Testing exact Jean-Paul Sarte.md content...\n");
    
    const exactContent = `---
id: Jean-Paul Sartre
aliases:
  - Jean-Paul Sartre
tags:
  - ADR
---

# Jean-Paul Sartre

`;

    console.log("File content:");
    console.log(JSON.stringify(exactContent));
    console.log("\nContent length:", exactContent.length);
    console.log("First 20 characters:", JSON.stringify(exactContent.substring(0, 20)));
    
    // Test the regex pattern
    const regex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/;
    const match = exactContent.match(regex);
    
    if (match) {
        console.log("\n✅ Regex matched!");
        console.log("Frontmatter content:", match[1]);
        
        // Test the full extraction
        const tags = extractTagsFromYamlFrontmatter(exactContent);
        console.log("\nExtracted tags:", tags);
    } else {
        console.log("\n❌ Regex did NOT match!");
    }
}

// Run regex test first
testRegexPattern();

// Run the test
testExactFile();

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
        name: "User's specific format",
        content: `---
id: Tailwind CSS
aliases: []
tags:
  - ServiceCore
  - ADR
---

# Content here`,
        expected: ["ServiceCore", "ADR"]
    },
    {
        name: "Jean-Paul Sartre exact format",
        content: `---
id: Jean-Paul Sartre
aliases:
  - Jean-Paul Sartre
tags:
  - ADR
---

# Jean-Paul Sartre`,
        expected: ["ADR"]
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
    
    // Try YAML extraction only
    const yamlTags = extractTagsFromYamlFrontmatter(testCase.content);
    
    const result = yamlTags;
    
    const passed = JSON.stringify(result.sort()) === JSON.stringify(testCase.expected.sort());
    
    console.log(`  Expected: [${testCase.expected.join(', ')}]`);
    console.log(`  Got:      [${result.join(', ')}]`);
    console.log(`  Status:   ${passed ? 'PASS' : 'FAIL'}`);
    console.log('');
});

console.log("Test completed!"); 