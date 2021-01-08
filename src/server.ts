import { RSA_NO_PADDING } from 'constants';
import express from 'express';
import { createServer } from 'http';
import path, { format } from 'path';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';

let PORT = process.env.PORT || 80;

// if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
//     PORT = 80;
// }

const app = express();
const server = createServer(app);

app.use(express.static(path.join(__dirname, '../website/build')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/build', 'index.html'))
});

app.get('/api/videoInfo', async (req, res) => {
    let url: string = (<any>req.query.url);
    if (url == null) return res.sendStatus(422);
    if (!ytdl.validateURL(url)) return res.sendStatus(422);
    try {
        let data = await ytdl.getInfo(url);
        if (data == null) return res.sendStatus(404);
        res.send(data);
    } catch (err) {
        if (err.message == "Video unavailable")
            res.sendStatus(404);
        else res.sendStatus(500);
    }
});

app.get('/api/downloadVideo', async (req, res) => {
    let url: string = (<any>req.query.url);
    let formatType: "3gp" | 'flv' | 'webm' | "mp4" | "avi" = (<any>req.query.format);
    if (formatType == null) return res.sendStatus(422);
    if (url == null) return res.sendStatus(422);
    if (!["3gp", 'flv', 'webm', "mp4", "avi"].includes(formatType)) return res.sendStatus(422);
    if (!ytdl.validateURL(url)) return res.sendStatus(422);
    try {
        let data = await ytdl.getInfo(url);
        if (data == null) return res.sendStatus(404);

        if (formatType == "mp4") {
            res.header('Content-Disposition', `attachment; filename="${data.videoDetails.title}.mp4"`);
            ytdl(url).pipe(res);
        } else {
            res.header('Content-Disposition', `attachment; filename="${data.videoDetails.title}.${formatType}"`);
            ffmpeg(ytdl(url)).format(formatType).pipe(res);
        }
    } catch (err) {
        console.log(err);
        if (err.message == "Video unavailable")
            res.status(404).send({ msg: 'Video not found' });
        else if (err.message == "Error: No such format found")
            res.status(404).send({ msg: 'Format not found' });
        else res.sendStatus(500);
    }
});

// app.get('/api/downloadVideo', async (req, res) => {
//     let url: string = (<any>req.query.url);
//     let formatType: "3gp" | 'flv' | 'webm' | "mp4" | "ts" | "avi" = (<any>req.query.format);
//     let quality: string = (<any>req.query.quality);
//     if (formatType == null) return res.sendStatus(422);
//     if (url == null) return res.sendStatus(422);
//     if (quality == null) return res.sendStatus(422);
//     // if (!['144p', '144p 15fps', '144p60 HDR', '240p', '240p60 HDR', '270p', '360p', '360p60 HDR'
//     //     , '480p', '480p60 HDR', '720p', '720p60', '720p60 HDR', '1080p', '1080p60', '1080p60 HDR', '1440p'
//     //     , '1440p60', '1440p60 HDR', '2160p', '2160p60', '2160p60 HDR', '4320p', '4320p60'].includes(quality)) return res.sendStatus(422);
//     if (!['144p', '144p 15fps', '144p60 HDR', '240p', '240p60 HDR', '270p', '360p', '360p60 HDR'
//         , '480p', '480p60 HDR', '720p', '720p60', '720p60 HDR', '1080p', '1080p60', '1080p60 HDR'].includes(quality)) return res.sendStatus(422);
//     if (!["3gp", 'flv', 'webm', "mp4", "ts", "avi"].includes(formatType)) return res.sendStatus(422);
//     if (!ytdl.validateURL(url)) return res.sendStatus(422);
//     try {
//         let data = await ytdl.getInfo(url);
//         if (data == null) return res.sendStatus(404);
//         if (!data.formats.some(x => x.qualityLabel == quality)) return res.status(404).send('This quality setting does not exist on this video');
//         console.log(data.formats.filter(x => x.qualityLabel == quality).map(x => x.quality));
//         console.log(data.formats.filter(x => x.qualityLabel == quality).map(x => x.container));
//         let getQuality = data.formats.some(x => x.qualityLabel == quality && x.quality == "highest") ? "highest" : data.formats.find(x => x.qualityLabel == quality)?.quality;

//         if (data.formats.some(x => x.container == formatType && x.qualityLabel == quality && x.quality == getQuality)) {
//             let getFormat = ytdl.chooseFormat(data.formats, { quality: quality });

//             console.log('Found format');
//             res.header('Content-Disposition', `attachment; filename="${data.videoDetails.title}.${format}"`);
//             ytdl(url, { format: getFormat }).pipe(res);
//         } else {
//             let hasFormat = ytdl.chooseFormat(data.formats, { filter: format => format.qualityLabel == quality });

//             if (hasFormat) {
//                 console.log('Format not found > using ffmpeg');
//                 res.header('Content-Disposition', `attachment; filename="${data.videoDetails.title}.${format}"`);
//                 ffmpeg(ytdl(url, hasFormat)).format(formatType).pipe(res);
//             } else res.status(404).send('Format not found!');
//         }
//     } catch (err) {
//         console.log(err);
//         if (err.message == "Video unavailable")
//             res.status(404).send({ msg: 'Video not found' });
//         else if (err.message == "Error: No such format found")
//             res.status(404).send({ msg: 'Format not found' });
//         else res.sendStatus(500);
//     }
// });

app.get('/api/downloadAudio', async (req, res) => {
    let url: string = (<any>req.query.url);
    let format: string = (<any>req.query.format);
    if (url == null) return res.sendStatus(422);
    if (format == null) return res.sendStatus(422);
    if (!["mp3", 'ogg', 'wav'].includes(format)) return res.sendStatus(422);
    if (!ytdl.validateURL(url)) return res.sendStatus(422);
    try {
        let data = await ytdl.getBasicInfo(url);
        if (data == null) return res.sendStatus(404);
        res.header('Content-Disposition', `attachment; filename="${data.videoDetails.title}.${format}"`);

        if (format == "mp3") {
            ytdl(url, {
                filter: "audioonly",
                quality: "highestaudio"
            }).pipe(res);
        } else {
            ffmpeg(ytdl(url, {
                filter: "audioonly",
                quality: "highestaudio"
            })).format(format).pipe(res);
        }
    } catch (err) {
        if (err.message == "Video unavailable")
            res.status(404).send({ msg: 'Video not found' });
        else if (err.message == "Error: No such format found")
            res.status(404).send({ msg: 'Format not found' });
        else res.sendStatus(500);
    }
});

// app.get('/api/getinfo', async (req, res) => {
//     let input: string = (<any>req.query.input);
//     if (input == null) return res.sendStatus(422);
//     if (ytdl.validateURL(input)) {
//         res.send(await ytdl.getInfo(input));
//     } else if (ytdl.validateID(input)) {
//         res.send(await ytdl.getInfo(input));
//     } else return res.sendStatus(422);
// });

server.listen(PORT, () => {
    console.log(`Listening to port: ${PORT}`);
});