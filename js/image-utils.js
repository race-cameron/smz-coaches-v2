/**
 * SMZ Coaches V2 — Image Utils
 *
 * Resizes/compresses uploaded photos client-side before they're stored
 * as base64 in localStorage. Without this, a handful of full-resolution
 * phone photos (roster faces + every generated card, kept forever for
 * progression history) would blow through the ~5-10MB per-origin
 * localStorage quota fast.
 */
const ImageUtils = (() => {

  // maxDimension: longest side, in pixels, after resize.
  // quality: JPEG compression quality (0-1).
  function fileToDataURL(file, maxDimension = 500, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('Please choose an image file.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not load image.'));
        img.onload = () => {
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round(height * (maxDimension / width));
              width = maxDimension;
            } else {
              width = Math.round(width * (maxDimension / height));
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  return { fileToDataURL };

})();
