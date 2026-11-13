/**
 * PDF Theme Configuration
 * Mirrors the Omnicura light-mode design tokens for jsPDF exports.
 * PDFs are always high-contrast light mode with crisp typography.
 */

export const PDF_THEME = {
  colors: {
    brandNavy: [18, 48, 90] as [number, number, number], // #12305A
    accentTeal: [20, 163, 179] as [number, number, number], // #14A3B3
    textPrimary: [11, 27, 51] as [number, number, number], // #0B1B33
    textSecondary: [81, 96, 122] as [number, number, number], // #51607A
    borderSubtle: [227, 232, 238] as [number, number, number], // #E3E8EE

    severity: {
      "non-urgent": {
        fill: [232, 246, 239] as [number, number, number],
        text: [31, 157, 99] as [number, number, number],
        border: [163, 230, 205] as [number, number, number],
      },
      urgent: {
        fill: [253, 243, 225] as [number, number, number],
        text: [138, 90, 18] as [number, number, number],
        border: [243, 156, 18] as [number, number, number],
      },
      emergency: {
        fill: [252, 235, 233] as [number, number, number],
        text: [192, 57, 43] as [number, number, number],
        border: [231, 76, 60] as [number, number, number],
      },
    },
  },
  typography: {
    fontFamily: "helvetica",
    titleSize: 18,
    headingSize: 11,
    bodySize: 9,
    captionSize: 8,
  },
} as const;
