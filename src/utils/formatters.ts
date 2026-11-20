export function formatTime(millis: number | undefined | null): string {
  if (!millis || isNaN(millis) || millis < 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cleanTrackTitle(fileName: string): { title: string; artist: string } {
  // Remove file extension
  let base = fileName.replace(/\.[^/.]+$/, '');
  
  // Replace underscores and multiple dashes
  base = base.replace(/_/g, ' ').trim();
  
  // Try to parse "Artist - Title" or "01 - Artist - Title" or "01 Title"
  // Check if format is "Artist - Title"
  if (base.includes(' - ')) {
    const parts = base.split(' - ');
    if (parts.length >= 2) {
      // Check if first part is a track number like "01"
      if (/^\d+$/.test(parts[0].trim()) && parts.length >= 3) {
        return {
          artist: parts[1].trim(),
          title: parts.slice(2).join(' - ').trim(),
        };
      }
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim(),
      };
    }
  }

  // Remove leading numbers like "01. ", "01 ", "01-"
  const cleanedTitle = base.replace(/^\d+[\s.-]+/, '').trim();
  
  return {
    title: cleanedTitle || base || 'Unknown Title',
    artist: 'Unknown Artist',
  };
}
