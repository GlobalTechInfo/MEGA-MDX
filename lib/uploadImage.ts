import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

/**
 * Upload buffer to catbox.moe
 * @param {Buffer} buffer
 * @returns {Promise<string>} direct URL
 */
async function uploadImage(buffer) {
    try {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Invalid buffer');
        }

        // 10MB limit (Catbox rule)
        if (buffer.length > 10 * 1024 * 1024) {
            throw new Error('File exceeds 10MB limit');
        }

        const type = await fileTypeFromBuffer(buffer);
        if (!type?.ext) {
            throw new Error('Unable to detect file type');
        }

        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('userhash', '');
        form.append('fileToUpload', buffer, `upload.${type.ext}`);

        const res = await axios.post(
            'https://catbox.moe/user/api.php',
            form,
            { headers: form.getHeaders(), timeout: 30000 }
        );

        if (typeof res.data !== 'string' || !res.data.startsWith('https://')) {
            throw new Error('Catbox upload failed');
        }

        return res.data;

    } catch(err: any) {
        console.error('[UPLOAD] Catbox error:', err.message);
        throw err;
    }
}

export { uploadImage };

