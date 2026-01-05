export function buildQueryParams(
  seriesId: number,
  from: Date | null = null,
  to: Date | null = null,
) {
  const currentDate = new Date().toISOString().split("T")[0];
  const endOfFrom = from ? new Date(from.setHours(23, 59, 59, 999)) : null;

  const fromDate = endOfFrom ? endOfFrom.toISOString().split("T")[0] : null;
  const toDate = to ? new Date(to).toISOString().split("T")[0] : null;

  return {
    series_id: seriesId,
    date_from: fromDate || currentDate,
    date_to: toDate || currentDate,
  };
}

export function scrapeDataFromHtml(html: string): { [key: string]: any }[] {
  if (!html?.trim()) return [];

  const results: { [key: string]: any }[] = [];

  // Pre-compiled regex patterns for better performance
  const headerRegex = /<th[^>]*>(.*?)<\/th>/gs;
  const htmlTagRegex = /<[^>]*>/g;
  const whitespaceRegex = /\s+/g;

  // Extract headers first
  const headers: string[] = [];
  let headerMatch: RegExpExecArray | null;

  while ((headerMatch = headerRegex.exec(html)) !== null && headerMatch[1]) {
    const headerText = headerMatch[1]
      .replace(htmlTagRegex, "")
      .replace(whitespaceRegex, " ")
      .trim();

    if (headerText) {
      headers.push(headerText);
    }
  }

  // If no headers found, return empty array
  if (headers.length === 0) return [];

  // Create dynamic regex pattern based on number of headers
  const cellPattern = "<td[^>]*>(.*?)</td>\\s*";
  const tableRowRegex = new RegExp(
    `<tr[^>]*>\\s*${cellPattern.repeat(headers.length)}</tr>`,
    "gs",
  );

  let match: RegExpExecArray | null;

  while ((match = tableRowRegex.exec(html)) !== null) {
    const rowData: { [key: string]: any } = {};
    let hasValidData = false;

    // Process each cell according to its header
    for (let i = 0; i < headers.length; i++) {
      const cellRaw = match[i + 1]
        ?.replace(htmlTagRegex, "")
        .replace(whitespaceRegex, " ")
        .trim();

      if (!cellRaw) continue;

      const header = headers[i]!;
      const headerLower = header.toLowerCase();

      // Handle different data types based on header name
      if (headerLower.includes("date") || headerLower.includes("time")) {
        // Handle date/time columns
        const date = new Date(cellRaw);
        if (!isNaN(date.getTime())) {
          rowData[header] = date.toISOString();
          hasValidData = true;
        }
      } else {
        // Try to parse as number first
        const numericValue = parseFloat(cellRaw);
        if (!isNaN(numericValue)) {
          rowData[header] = numericValue;
          hasValidData = true;
        } else {
          // Keep as string if not numeric
          rowData[header] = cellRaw;
          hasValidData = true;
        }
      }
    }

    // Only add row if we have at least one valid data point
    if (hasValidData && Object.keys(rowData).length > 0) {
      results.push(rowData);
    }
  }

  return results;
}
