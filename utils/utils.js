import axios from 'axios'
import sharp from 'sharp'
import pako  from 'pako' 
/**
 * 图片URL转Base64
 * @param {*} url 图片url
 * @returns 
 */
export async function url2Base64(url) {
    let base64 = await axios.get(url, {
        responseType: 'arraybuffer'
    }).then(res => {
        return Buffer.from(res.data, 'binary').toString('base64')
    }).catch(err => {
        console.log(err)
    })
    return base64
}

/**
 * 获取NAI alpha通道EXIF信息
 * @param {*} url 图片Arraybuffer
 * @returns 
 */
class DataReader {
    constructor(data) {
        this.data = data;
        this.index = 0;
    }

    readBit() {
        return this.data[this.index++];
    }

    readNBits(n) {
        let bits = [];
        for (let i = 0; i < n; i++) {
            bits.push(this.readBit());
        }
        return bits;
    }

    readByte() {
        let byte = 0;
        for (let i = 0; i < 8; i++) {
            byte |= this.readBit() << (7 - i);
        }
        return byte;
    }

    readNBytes(n) {
        let bytes = [];
        for (let i = 0; i < n; i++) {
            bytes.push(this.readByte());
        }
        return bytes;
    }

    readInt32() {
        let bytes = this.readNBytes(4);
        return new DataView(new Uint8Array(bytes).buffer).getInt32(0, false);
    }
}
export async function getStealthExif(imageArraybuffer) {
    let time = performance.now();

    const metadata  = await sharp(imageArraybuffer).metadata();
    if (metadata.hasAlpha == false){
        console.log("no alpha channel found");
        return null;
    }
    const rawPixels = await sharp(imageArraybuffer).raw().toBuffer();

    let lowestData = [];
    for (let x = 0; x < metadata.width; x++) {
        for (let y = 0; y < metadata.height; y++) {
            let index = (y * metadata.width + x) * 4;
            let a = rawPixels[index + 3];
            lowestData.push(a & 1);
        }
    }

    console.log("Time taken: ", performance.now() - time, "ms");

    const magic = "stealth_pngcomp";
    const reader = new DataReader(lowestData);
    const readMagic = reader.readNBytes(magic.length);
    const magicString = String.fromCharCode.apply(null, readMagic);

    if (magic === magicString) {
        const dataLength = reader.readInt32();
        const gzipData = reader.readNBytes(dataLength / 8);
        const data = pako.ungzip(new Uint8Array(gzipData));
        const jsonString = new TextDecoder().decode(new Uint8Array(data));
        const json = JSON.parse(jsonString);
        return json;
    } else {
        console.log("Magic number not found.");
    }
    return null;
}