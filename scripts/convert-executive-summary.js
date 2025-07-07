const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

async function convertMarkdownToPdf(markdownFilePath, outputPdfPath) {
    try {
        // Read the markdown file
        const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
        
        // Convert markdown to HTML
        const htmlContent = marked(markdownContent);
        
        // Create a complete HTML document with styling
        const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Enxi ERP - Executive Summary</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    color: #2563eb;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                    font-size: 2.5em;
                }
                h2 {
                    color: #1d4ed8;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 8px;
                    margin-top: 40px;
                    margin-bottom: 20px;
                    font-size: 1.8em;
                }
                h3 {
                    color: #1e40af;
                    margin-top: 30px;
                    margin-bottom: 15px;
                    font-size: 1.3em;
                }
                h4 {
                    color: #3730a3;
                    margin-top: 25px;
                    margin-bottom: 10px;
                    font-size: 1.1em;
                }
                ul, ol {
                    margin-bottom: 20px;
                }
                li {
                    margin-bottom: 8px;
                }
                strong {
                    color: #1e40af;
                    font-weight: 600;
                }
                .emoji {
                    font-size: 1.2em;
                }
                hr {
                    border: none;
                    border-top: 2px solid #e5e7eb;
                    margin: 40px 0;
                }
                blockquote {
                    border-left: 4px solid #2563eb;
                    margin: 20px 0;
                    padding-left: 20px;
                    font-style: italic;
                    color: #6b7280;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                    h1, h2, h3, h4 {
                        page-break-after: avoid;
                    }
                    ul, ol, blockquote {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
        `;
        
        // Launch puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set the HTML content
        await page.setContent(fullHtml, {
            waitUntil: 'networkidle0'
        });
        
        // Generate PDF
        await page.pdf({
            path: outputPdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });
        
        await browser.close();
        
        console.log(`PDF generated successfully: ${outputPdfPath}`);
        
    } catch (error) {
        console.error('Error converting markdown to PDF:', error);
        throw error;
    }
}

// Main execution
const markdownFile = path.join(__dirname, '../presales-documents/Enxi-ERP-Executive-Summary.md');
const outputPdf = path.join(__dirname, '../presales-documents/Enxi-ERP-Executive-Summary.pdf');

convertMarkdownToPdf(markdownFile, outputPdf)
    .then(() => {
        console.log('Executive Summary PDF conversion completed successfully!');
    })
    .catch((error) => {
        console.error('Conversion failed:', error);
        process.exit(1);
    });