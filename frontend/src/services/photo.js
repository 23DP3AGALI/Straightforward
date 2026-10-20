export function resizeImage(file, maxSide = 320) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Choose an image file."));
    }
    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error("The image is too large (max 10 MB)."));
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not process this image."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let quality = 0.82;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > 120_000 && quality > 0.42) {
        quality -= 0.08;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      if (result.length > 120_000) {
        reject(new Error("This image cannot be reduced enough. Choose a simpler image."));
        return;
      }
      resolve(result);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };

    img.src = url;
  });
}
