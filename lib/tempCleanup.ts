import fs from 'fs';
import path from 'path';

function cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
        return;
    }
    
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            console.error('Error reading temp directory:', err);
            return;
        }
        
        let cleanedCount = 0;
        const now = Date.now();
        const maxAge = 1 * 60 * 60 * 1000; // 1 hours
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            cleanedCount++;
                            console.log(`Cleaned temp file: ${file}`);
                        }
                    });
                }
            });
        });
        
        if (cleanedCount > 0) {
            console.log(`Cleaned ${cleanedCount} temp files`);
        }
    });
}

cleanupTempFiles();

setInterval(cleanupTempFiles, 60 * 60 * 1000);

export default { cleanupTempFiles };

