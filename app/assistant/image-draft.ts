export async function imageDraft(file: File) {
  if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024)
    throw Error("Choose a photo under 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      image.naturalWidth * image.naturalHeight > 40_000_000
    )
      throw Error("Choose a smaller image.");
    const scale = Math.min(
      1,
      1024 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw Error("Image preview unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(Error("Image could not be prepared.")),
        "image/webp",
        0.82,
      ),
    );
    return new File([blob], "image.webp", { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
