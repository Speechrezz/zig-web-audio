const http = require('http');
const fs = require('fs');
const path = require('path');

// Define the port to run the server on
const port = 8000;

// Function to determine the MIME type based on the file extension
function getContentType(extname) {
    switch (extname) {
        case '.html':
            return 'text/html';
        case '.js':
            return 'application/javascript';
        case '.css':
            return 'text/css';
        case '.json':
            return 'application/json';
        case '.png':
            return 'image/png';
        case '.jpg':
            return 'image/jpg';
        case '.wav':
            return 'audio/wav';
        case '.wasm':
            return 'application/wasm';
        default:
            return 'application/octet-stream';  // Fallback for unknown types
    }
}

http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html'; // Default to index.html if no file is specified
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = getContentType(extname);

    // Read the requested file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // If file is not found, return 404
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404: File Not Found', 'utf-8');
            } else {
                // For any other errors
                res.writeHead(500);
                res.end(`Server error: ${error.code}`);
            }
        } else {
            // Serve the file with the appropriate content type
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp'
            });
            res.end(content, 'utf-8');
        }
    });
}).listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});