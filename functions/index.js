const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require("fs");
const path = require("path");
const os = require("os");
const UUID = require('uuid-v4');
const compress_images = require('compress-images')

admin.initializeApp();

async function fileToBase64(base64String, name) {
  let fileBucket = 'imagecompression-7b058.appspot.com'
  let bucket = admin.storage().bucket(fileBucket);
  let [data, base64] = base64String.split(';base64,');
  let contentType = data.replace("data:","");
  let extension = contentType.split("/")[1];
  let uuid = UUID();
  let filename = `${name}.${extension}`;
  let tempFilePath = path.join(os.tmpdir(),filename);
  var OUTPUT_path = path.join(os.tmpdir(), "compressed_"); 
  fs.writeFile(tempFilePath, base64, {encoding: 'base64'}, function(err) {
    if(err != null){
      console.log(err);
    }
  });
  try{
      await compress_images(tempFilePath, OUTPUT_path)
      await bucket.upload(OUTPUT_path + filename, {
        uploadType: "media",
        destination: filename,
        metadata: {
          contentType: contentType,
          metadata: {
            firebaseStorageDownloadTokens: uuid
          }
        }
      });
      return "https://firebasestorage.googleapis.com/v0/b/" + fileBucket + "/o/" + encodeURIComponent(filepath) + "?alt=media&token=" + uuid;
  } catch (e) {
      console.log(e)
      throw e
  }
}

/**
 * @param {String} picture (EX: data:image/png,base64;)
 */
exports.createImage = functions.https.onRequest(async (req, res) => {
    let {
      picture
    } = req.body;
    try{
        var result = await fileToBase64(picture, 'test');
        return res.status(200).json({ msg: result });
    }catch(e){
        return res.status(500);
    }
});

async function comprimirImagem(tempFilePath, OUTPUT_path){
    return new Promise(function (resolve, reject) {
        compress_images(tempFilePath, OUTPUT_path, { compress_force: false, statistic: true, autoupdate: true }, false,
          { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
          { png: { engine: 'pngquant', command: ['--quality=20-50'] } },
          { svg: { engine: 'svgo', command: '--multipass' } },
          { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } }, function (error, completed, statistic) {
            if(error != null)
                reject(error)
            resolve()
          });
    })
}
