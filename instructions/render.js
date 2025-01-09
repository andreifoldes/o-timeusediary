import { marked } from 'marked';

export async function renderMarkdownFiles() {
    const markdownFiles = ['1.md', '2.md', '3.md'];
    const instructionsDir = 'instructions';
    
    for (const file of markdownFiles) {
        try {
            const response = await fetch(`${instructionsDir}/${file}`);
            const markdown = await response.text();
            const html = marked(markdown);
            
            const htmlFile = file.replace('.md', '.html');
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Instructions</title>
                    <link rel="stylesheet" href="instructions.css">
                </head>
                <body>
                    <div class="content">
                        ${html}
                    </div>
                    <div class="navigation">
                        <button id="backBtn" onclick="window.history.back()">Back</button>
                        <button id="continueBtn" onclick="window.location.href='${
                            file === '3.md' ? 'index.html' : file.replace('.md', parseInt(file) + 1 + '.html')
                        }'">Continue</button>
                    </div>
                    <script src="instructions.js"></script>
                </body>
                </html>`;
                
            // In a real implementation, you would write this to the filesystem
            console.log(`Generated ${htmlFile}`);
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }
}
