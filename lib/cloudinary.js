const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    }).end(buffer);
  });
}

function uploadFile(filePath, options) {
  return cloudinary.uploader.upload(filePath, options);
}

function destroy(publicId, options = {}) {
  return cloudinary.uploader.destroy(publicId, options);
}

function publicIdFromUrl(url) {
  if (!url) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  let p = parts[1].replace(/^v\d+\//, '');
  p = p.replace(/\.[^./]+$/, '');
  return p;
}

module.exports = { uploadBuffer, uploadFile, destroy, publicIdFromUrl };
