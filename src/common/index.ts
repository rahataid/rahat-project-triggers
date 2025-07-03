import * as cheerio from 'cheerio';
export const getFormattedDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1); // Set date to previous day
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
  const rpTable2yr = $(
    'table[class="table-forecast-result table-forecast-result-global"][summary="ECMWF-ENS > 2 yr RP"]',
  );

  // 5 yr return period table
  const rpTable5yr = $(
    'table[class="table-forecast-result table-forecast-result-global"][summary="ECMWF-ENS > 5 yr RP"]',
  );

  // 20 yr return period table
  const rpTable20yr = $(
    'table[class="table-forecast-result table-forecast-result-global"][summary="ECMWF-ENS > 20 yr RP"]',
  );

  // point forecast table
  const pfTable = $('table.tbl_info_point[summary="Point Forecast"]');

  const hydrographElement = $('.forecast_images').find(
    'img[alt="Discharge Hydrograph (ECMWF-ENS)"]',
  );

  if (
    rpTable2yr.length === 0 ||
    rpTable5yr.length === 0 ||
    rpTable20yr.length === 0 ||
    pfTable.length === 0 ||
    hydrographElement.length === 0
  ) {
    return;
  }

  const returnPeriodTable2yr = parseReturnPeriodTable(rpTable2yr, $);
  const returnPeriodTable5yr = parseReturnPeriodTable(rpTable5yr, $); 
  const returnPeriodTable20yr = parseReturnPeriodTable(rpTable20yr, $);
  const pointForecastData = parsePointForecast(pfTable, $);
  const hydrographImageUrl = hydrographElement.attr('src');
  return {
    returnPeriodTable2yr,
    returnPeriodTable5yr,
    returnPeriodTable20yr,
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

export const getTriggerAndActivityCompletionTimeDifference = (
  start: Date,
  end: Date,
) => {
  const trigger = new Date(start);
  const completion = new Date(end);

  const isCompletedEarlier = completion < trigger;

  const msDifference = completion.getTime() - trigger.getTime();
  const absoluteMsDifference = Math.abs(msDifference);

  let differenceInSeconds = Math.floor(absoluteMsDifference / 1000);

  const days = Math.floor(differenceInSeconds / (24 * 3600));
  differenceInSeconds %= 24 * 3600;

  const hours = Math.floor(differenceInSeconds / 3600);
  differenceInSeconds %= 3600;

  const minutes = Math.floor(differenceInSeconds / 60);
  const seconds = differenceInSeconds % 60;

  const parts = [
    days ? `${days} day${days !== 1 ? 's' : ''}` : '',
    hours ? `${hours} hour${hours !== 1 ? 's' : ''}` : '',
    minutes ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : '',
    seconds ? `${seconds} second${seconds !== 1 ? 's' : ''}` : '',
  ];

  const result = parts.filter(Boolean).join(' ');

  return isCompletedEarlier ? `-${result}` : result;
};

export function buildQueryParams(seriesId: number, from = null, to = null) {
  const currentDate = new Date().toISOString().split('T')[0];
  from = from ? new Date(from).toISOString().split('T')[0] : null;
  to = to ? new Date(to).toISOString().split('T')[0] : null;

  return {
    series_id: seriesId,
    date_from: from || currentDate,
    date_to: to || currentDate,
  };
}
