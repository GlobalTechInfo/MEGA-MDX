/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function uploadToCatbox(filePath) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(filePath));

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        return {
            status: true,
            url: response.data.trim()
        };
    } catch(error: any) {
        throw new Error(`Catbox upload failed: ${error.message}`);
    }
}

async function uploadToPomf2(filePath) {
    try {
        const form = new FormData();
        form.append('files[]', fs.createReadStream(filePath));

        const response = await axios.post('https://pomf2.lain.la/upload.php', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000
        });

        if (response.data.success && response.data.files && response.data.files.length > 0) {
            return {
                status: true,
                url: 'https://pomf2.lain.la/f/' + response.data.files[0].url
            };
        } else {
            throw new Error('Upload failed');
        }
    } catch(error: any) {
        throw new Error(`Pomf2 upload failed: ${error.message}`);
    }
}

async function uploadToImgbb(filePath, apiKey) {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');

        const form = new FormData();
        form.append('image', base64Image);

        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form, {
            headers: form.getHeaders()
        });

        if (response.data.success) {
            return {
                status: true,
                url: response.data.data.url,
                display_url: response.data.data.display_url,
                delete_url: response.data.data.delete_url
            };
        } else {
            throw new Error('Upload failed');
        }
    } catch(error: any) {
        throw new Error(`Imgbb upload failed: ${error.message}`);
    }
}

async function uploadToFreeimage(filePath) {
    try {
        const form = new FormData();
        form.append('source', fs.createReadStream(filePath));
        form.append('type', 'file');
        form.append('action', 'upload');

        const response = await axios.post('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.success) {
            return {
                status: true,
                url: response.data.image.url,
                display_url: response.data.image.display_url,
                delete_url: response.data.image.delete_url
            };
        } else {
            throw new Error('Upload failed');
        }
    } catch(error: any) {
        throw new Error(`Freeimage upload failed: ${error.message}`);
    }
}

async function uploadToLitterbox(filePath, time = '1h') {
    try {
        if (!['1h', '12h', '24h', '72h'].includes(time)) {
            time = '1h';
        }

        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('time', time);
        form.append('fileToUpload', fs.createReadStream(filePath));

        const response = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        return {
            status: true,
            url: response.data.trim(),
            expires: time
        };
    } catch(error: any) {
        throw new Error(`Litterbox upload failed: ${error.message}`);
    }
}

async function uploadToPixhost(filePath) {
    try {
        const form = new FormData();
        form.append('img', fs.createReadStream(filePath));
        form.append('content_type', '0');

        const response = await axios.post('https://api.pixhost.to/images', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.show_url) {
            const showUrl = response.data.show_url;
            const pageRes = await axios.get(showUrl);
            const match = pageRes.data.match(/<img id="image" src="([^"]+)"/);
            if (match && match[1]) {
                return {
                    status: true,
                    url: match[1]
                };
            }
        }
        throw new Error('Failed to extract image URL from Pixhost');
    } catch(error: any) {
        throw new Error(`Pixhost upload failed: ${error.message}`);
    }
}

async function uploadToTmpfiles(filePath) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.status === 'success') {
            const url = response.data.data.url;
            const directUrl = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            
            return {
                status: true,
                url: directUrl,
                page_url: url
            };
        } else {
            throw new Error('Upload failed');
        }
    } catch(error: any) {
        throw new Error(`Tmpfiles upload failed: ${error.message}`);
    }
}

async function uploadToQuax(filePath) {
    try {
        const form = new FormData();
        form.append('files[]', fs.createReadStream(filePath));

        const response = await axios.post('https://qu.ax/upload.php', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.success && response.data.files && response.data.files.length > 0) {
            return {
                status: true,
                url: response.data.files[0].url
            };
        } else {
            throw new Error('Upload failed');
        }
    } catch(error: any) {
        throw new Error(`Qu.ax upload failed: ${error.message}`);
    }
}

async function uploadToX0(filePath) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await axios.post('https://x0.at/', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        return {
            status: true,
            url: response.data.trim()
        };
    } catch(error: any) {
        throw new Error(`X0.at upload failed: ${error.message}`);
    }
}

async function uploadToUguu(filePath) {
    try {
        const form = new FormData();
        form.append('files[]', fs.createReadStream(filePath));

        const response = await axios.post('https://uguu.se/upload.php', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.success && response.data.files && response.data.files[0]) {
            return {
                status: true,
                url: response.data.files[0].url
            };
        } else {
            throw new Error('Invalid response structure');
        }
    } catch(error: any) {
        throw new Error(`Uguu upload failed: ${error.message}`);
    }
}

async function uploadFile(filePath) {
    const uploaders = [
        { name: 'Catbox', fn: () => uploadToCatbox(filePath) },
        { name: 'Qu.ax', fn: () => uploadToQuax(filePath) },
        { name: 'Uguu', fn: () => uploadToUguu(filePath) },
        { name: 'Pomf2', fn: () => uploadToPomf2(filePath) },
        { name: 'Tmpfiles', fn: () => uploadToTmpfiles(filePath) },
        { name: 'Freeimage', fn: () => uploadToFreeimage(filePath) },
        { name: 'Pixhost', fn: () => uploadToPixhost(filePath) }
    ];

    for (const uploader of uploaders) {
        try {
            console.log(`[Upload] Trying ${uploader.name}...`);
            const result = await uploader.fn();
            console.log(`[Upload] ✓ Success with ${uploader.name}`);
            return { ...result, service: uploader.name };
        } catch(error: any) {
            console.error(`[Upload] ✗ ${uploader.name} failed:`, error.message);
            continue;
        }
    }

    throw new Error('All upload services failed');
}

export {
    uploadToCatbox,
    uploadToPomf2,
    uploadToImgbb,
    uploadToFreeimage,
    uploadToLitterbox,
    uploadToUguu,
    uploadToPixhost,
    uploadToTmpfiles,
    uploadToQuax,
    uploadToX0,
    // Multi-service
    uploadFile
};

/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


