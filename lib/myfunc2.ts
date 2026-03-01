

import axios from 'axios';
import * as cheerio from 'cheerio';
import { resolve } from 'path';
import util from 'util';
import BodyForm from 'form-data'
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs'
import child_process from 'child_process';
import ffmpeg from 'fluent-ffmpeg';

import { promises as fsPromises } from 'fs';
const { unlink } = fsPromises;


export const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch(err: any) {
        return err
    }
}
export const fetchBuffer = async (url, options) => {
	try {
		options ? options : {}
		const res = await axios({
			method: "GET",
			url,
			headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36",
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch(err: any) {
		return err
	}
}
export const webp2mp4File = async(path) =>{
	return new Promise((resolve, reject) => {
		 const form = new BodyForm()
		 form.append('new-image-url', '')
		 form.append('new-image', fs.createReadStream(path))
		 axios({
			  method: 'post',
			  url: 'https://s6.ezgif.com/webp-to-mp4',
			  data: form,
			  headers: {
				   'Content-Type': `multipart/form-data; boundary=${(form as any)._boundary}`
			  }
		 }).then(({ data }) => {
			  const bodyFormThen = new BodyForm()
			  const $ = cheerio.load(data)
			  const file = $('input[name="file"]').attr('value')
			  bodyFormThen.append('file', file)
			  bodyFormThen.append('convert', "Convert WebP to MP4!")
			  axios({
				   method: 'post',
				   url: 'https://ezgif.com/webp-to-mp4/' + file,
				   data: bodyFormThen,
				   headers: {
						'Content-Type': `multipart/form-data; boundary=${(bodyFormThen as any)._boundary}`
				   }
			  }).then(({ data }) => {
				   const $ = cheerio.load(data)
				   const result = 'https:' + $('div#output > p.outfile > video > source').attr('src')
				   resolve({
						status: true,
						message: "Created By Eternity",
						result: result
				   })
			  }).catch(reject)
		 }).catch(reject)
	})
}

export const fetchUrl = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch(err: any) {
        return err
    }
}

export const WAVersion = async () => {
    let get = await exports.fetchUrl("https://web.whatsapp.com/check-update?version=1&platform=web")
    let version = [get.currentVersion.replace(/[.]/g, ", ")]
    return version
}

export const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

export const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'gi'))
}

export const isNumber = (number) => {
    const int = parseInt(number)
    return typeof int === 'number' && !isNaN(int)
}
export const TelegraPh = (Path) =>{
	return new Promise (async (resolve, reject) => {
		if (!fs.existsSync(Path)) return reject(new Error("File not Found"))
		try {
			const form = new BodyForm();
			form.append("file", fs.createReadStream(Path))
			const data = await  axios({
				url: "https://telegra.ph/upload",
				method: "POST",
				headers: {
					...form.getHeaders()
				},
				data: form
			})
			return resolve("https://telegra.ph" + data.data[0].src)
		} catch(err: any) {
			return reject(new Error(String(err)))
		}
	})
}
const sleepy = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export const buffergif = async (image) => {
        
	const filename = `${Math.random().toString(36)}`
			await fs.writeFileSync(`./XeonMedia/trash/${filename}.gif`, image)
					 child_process.exec(
								`ffmpeg -i ./XeonMedia/trash/${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ./XeonMedia/trash/${filename}.mp4`
										) 
  await sleepy(4000)
  
	var buffer5  =  await  fs.readFileSync(`./XeonMedia/trash/${filename}.mp4`)
	Promise.all([unlink(`./XeonMedia/video/${filename}.mp4`), unlink(`./XeonMedia/gif/${filename}.gif`)])
	return buffer5
				   }