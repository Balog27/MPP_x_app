const fs = require('fs');
const path = require('path');

function showServerFile() {
  const serverPath = path.join(__dirname, '../../server.js');
  
  try {
    if (fs.existsSync(serverPath)) {
      console.log('Contents of server.js:');
      console.log('======================');
      const content = fs.readFileSync(serverPath, 'utf8');
      console.log(content);
    } else {
      console.error('server.js not found at:', serverPath);
      
      // Try to find the server file elsewhere
      const rootPath = path.join(__dirname, '../../');
      console.log('Searching for server file in:', rootPath);
      
      const files = fs.readdirSync(rootPath);
      const possibleServerFiles = files.filter(file => 
        file.includes('server') || 
        file.includes('app') || 
        file.includes('index')
      );
      
      if (possibleServerFiles.length > 0) {
        console.log('Possible server files found:', possibleServerFiles);
      } else {
        console.log('No obvious server files found in the root directory.');
      }
    }
  } catch (error) {
    console.error('Error reading server file:', error);
  }
}

showServerFile();