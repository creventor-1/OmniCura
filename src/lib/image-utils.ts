/**
 * Client-side image validation and compression utilities.
 * Compresses images before uploading to minimize Gemini token consumption
 * and bandwidth while maintaining clinical clarity.
 */

export interface ProcessedImage {
  base64: string;
  mimeType: string;
  sizeBytes: number;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_FILE_SIZE = 10 * 1024 * 1024; // 10MB input limit
const MAX_DIMENSION = 1024; // Max width or height in px
const JPEG_QUALITY = 0.82; // Balance quality vs token efficiency

export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: "Please upload a JPEG, PNG, or WebP image.",
    };
  }

  if (file.size > MAX_RAW_FILE_SIZE) {
    return {
      isValid: false,
      error: "Image exceeds 10MB. Please select a smaller image.",
    };
  }

  return { isValid: true };
}

/**
 * Compresses and resizes an image file client-side using an HTML5 Canvas.
 */
export async function compressImageFile(file: File): Promise<ProcessedImage> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid image file");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image data."));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale down proportionally if larger than MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context."));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const prefix = "data:image/jpeg;base64,";
        const base64 = dataUrl.startsWith(prefix) ? dataUrl.slice(prefix.length) : dataUrl.split(",")[1];

        // Approximate byte size
        const sizeBytes = Math.round((base64.length * 3) / 4);

        resolve({
          base64,
          mimeType: "image/jpeg",
          sizeBytes,
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
