import * as cheerio from 'cheerio';
export const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-based month, hence add 1
  const day = String(date.getDate()).padStart(2, '0');

  const dateTimeString = `${year}-${month}-${day}T00:00:00`;
  const dateString = `${year}-${month}-${day}`;

  return { dateString, dateTimeString };
};
export function parseGlofasData(content: string) {
  const $ = cheerio.load(content);

  // 2 yr return period table
  const rpTable = $(
    'table[class="table-forecast-result table-forecast-result-global"][summary="ECMWF-ENS > 2 yr RP"]',
  );

  // point forecast table
  const pfTable = $('table.tbl_info_point[summary="Point Forecast"]');

  const hydrographElement = $('.forecast_images').find(
    'img[alt="Discharge Hydrograph (ECMWF-ENS)"]',
  );

  if (
    rpTable.length === 0 ||
    pfTable.length === 0 ||
    hydrographElement.length === 0
  ) {
    return;
  }

  const returnPeriodTable = parseReturnPeriodTable(rpTable, $);
  const pointForecastData = parsePointForecast(pfTable, $);
  const hydrographImageUrl = hydrographElement.attr('src');

  return {
    returnPeriodTable,
    pointForecastData,
    hydrographImageUrl,
  };
}
function parseReturnPeriodTable(
  rpTable: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
) {
  // first header row, consists of column names
  const headerRow = rpTable.find('tr').first();
  // get column names (th elements in tr)
  const returnPeriodHeaders = headerRow
    .find('th')
    .map((_, element) => $(element).text().trim())
    .toArray();

  // first 5 data row (excluding the header) , data from latest day
  const dataRow = rpTable.find('tr').slice(1, 6);
  const returnPeriodData = [];

  for (const row of dataRow) {
    const dataValues = $(row)
      .find('td')
      .map((_, element) => $(element).text().trim())
      .toArray();

    returnPeriodData.push(dataValues);
  }

  return { returnPeriodData, returnPeriodHeaders };
}

function parsePointForecast(
  pfTable: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
) {
  const headerRow = pfTable.find('tr').first();
  const columnNames = headerRow
    .find('th')
    .map((i, element) => $(element).text().trim())
    .toArray();

  const dataRow = pfTable.find('tr').eq(1);

  const forecastDate = dataRow.find('td:nth-child(1)').text().trim(); // Using nth-child selector
  const maxProbability = dataRow.find('td:nth-child(2)').text().trim();
  const alertLevel = dataRow.find('td:nth-child(3)').text().trim();
  const maxProbabilityStep = dataRow.find('td:nth-child(4)').text().trim();
  const dischargeTendencyImage = dataRow
    .find('td:nth-child(5) img')
    .attr('src'); // Extract image src
  const peakForecasted = dataRow.find('td:nth-child(6)').text().trim();

  return {
    forecastDate: {
      header: columnNames[0],
      data: forecastDate,
    },
    maxProbability: {
      header: columnNames[1],
      data: maxProbability,
    },
    alertLevel: {
      header: columnNames[2],
      data: alertLevel,
    },
    maxProbabilityStep: {
      header: columnNames[3],
      data: maxProbabilityStep,
    },
    dischargeTendencyImage: {
      header: columnNames[4],
      data: dischargeTendencyImage,
    },
    peakForecasted: {
      header: columnNames[5],
      data: peakForecasted,
    },
  };
}
