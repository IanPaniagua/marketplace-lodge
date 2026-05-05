import imageCompression from 'browser-image-compression';

export async function compressToWebp(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1280,
    fileType: 'image/webp',
    initialQuality: 0.82,
    useWebWorker: true,
  });
  return new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
    type: 'image/webp',
  });
}
