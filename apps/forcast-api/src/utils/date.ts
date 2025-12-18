export function parseDate(dateString?: string): string {
  if (!dateString) {
    return new Date().toISOString().split('T')[0];
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }

    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date().toISOString().split('T')[0];
  }
}
