// Уменьшает выбранную фотографию в браузере и возвращает её как data URL (JPEG).
// Так фото занимает ~50-100 КБ и помещается в localStorage.
// Позже, с backend, файл будет загружаться на сервер.
export function resizeImage(file, maxSide = 640) {
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
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };

    img.src = url;
  });
}
