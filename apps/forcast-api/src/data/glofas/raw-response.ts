export const glofasRawResponseTemplate = `
<table class="tbl_info_point" summary="Point Information">
    <tr>
        <th class="cell_header">Station ID</th>
        <th>Country</th>
        <th>Basin</th>
        <th>River</th>
        <th>Station Name</th>
        <th>Point ID</th>
        <th>Drainage Area [km2]</th>
        <th>Longitude [Deg]</th>
        <th>Latitude [Deg]</th>
        <th>LISFLOOD Drainage Area [km2]</th>
        <th>LISFLOOD X [Deg]</th>
        <th>LISFLOOD Y [Deg]</th>
    </tr>
    <tr>
        <td>G4475</td>
        <td>{{country}}</td>
        <td>{{basin}}</td>
        <td>{{river}}</td>
        <td>{{stationName}}</td>
        <td>SI001169</td>
        <td>NA</td>
        <td>{{longitude}}</td>
        <td>{{latitude}}</td>
        <td>53,998</td>
        <td>87.125</td>
        <td>26.825</td>
    </tr>
</table>
<table class="tbl_info_point" summary="Point Forecast">
    <caption>Point Forecast</caption>
    <tr>
        <th class="cell_header">Forecast Date</th>
        <th>Maximum probability (2 yr / 5 yr / 20 yr)</th>
        <th>Alert level</th>
        <th>Max probability step (earliest)</th>
        <th>Discharge tendency</th>
        <th>Peak forecasted</th>
    </tr>
    <tr>
        <td>{{forecastDate}}</td>
        <td>{{probability}} / {{probability}} / {{probability}}</td>
        <td>Inactive</td>
        <td>No Data</td>
        <td><img class="img-responsive"
                src="https://global-flood.emergency.copernicus.eu/static/images/viewer/RisingArrow.gif"
                alt="Discharge tendency"></td>
        <td>in 1 day (on 2025-10-31)</td>
    </tr>
</table><br><a href="#" class="open_close"
    onclick="$('.forecast_images').toggle('1000');return false;">&gt;&gt;Open/Close GloFAS Forecast
    images</a><br><br><br>
<div class="forecast_images">
    <span class="title">Discharge Hydrograph</span><img class="img-responsive"
        src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202510/2025103000/SI001221_Dis_EGE2025103000.svg"
        alt="Discharge Hydrograph" width="800" height="380"><br><span class="title">Upstream Precipitation</span><img
        class="img-responsive"
        src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202510/2025103000/SI001221_Rups_EGE2025103000.svg"
        alt="Upstream Precipitation" width="800" height="320"><br><span class="title">Upstream Snowmelt</span><img
        class="img-responsive"
        src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202510/2025103000/SI001221_Smups_EGE2025103000.svg"
        alt="Upstream Snowmelt" width="800" height="320"><br><span class="title">Average Temperature</span><img
        class="img-responsive"
        src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202510/2025103000/SI001221_Ta_EGE2025103000.svg"
        alt="Average Temperature" width="800" height="320"><br>
</div>
<table class="table-forecast-result table-forecast-result-global" summary="Forecasts Overview (2025-10-30 00:00)">
    <caption>Forecasts Overview (2025-10-30 00:00)</caption>
    <colgroup></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <colgroup class="overview"></colgroup>
    <thead>
        <tr>
            <th class="cell_header">Forecast Type</th>
            <th>30</th>
            <th>31</th>
            <th>01</th>
            <th>02</th>
            <th>03</th>
            <th>04</th>
            <th>05</th>
            <th>06</th>
            <th>07</th>
            <th>08</th>
            <th>09</th>
            <th>10</th>
            <th>11</th>
            <th>12</th>
            <th>13</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="cell_header">IFS ENS</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
        </tr>
        <tr>
            <td class="cell_header">AIFS Single</td>
            <td class="ffffff"></td>
            <td class="ffffff">*</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
            <td class="ffffff">↓</td>
        </tr>
    </tbody>
</table>
<table class="table-forecast-result table-forecast-result-global" summary="AIFS Single">
    <caption>AIFS Single</caption>
    <colgroup></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <colgroup class="AIFS"></colgroup>
    <thead>
        <tr>
            <th class="cell_header">Forecast Day</th>
            <th>24</th>
            <th>25</th>
            <th>26</th>
            <th>27</th>
            <th>28</th>
            <th>29</th>
            <th>30</th>
            <th>31</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
            <th>6</th>
            <th>7</th>
            <th>8</th>
            <th>9</th>
            <th>10</th>
            <th>11</th>
            <th>12</th>
            <th>13</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="cell_header">2025-10-30</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-29</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-28</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-27</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-26</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-25</td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-24</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
    </tbody>
</table>
<table class="table-forecast-result table-forecast-result-global" summary="IFS ENS &gt; 2 yr RP">
    <caption>IFS ENS &gt; 2 yr RP</caption>
    <colgroup></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <colgroup class="egeGtMal"></colgroup>
    <thead>
        <tr>
            <th class="cell_header">Forecast Day</th>
            <th>24</th>
            <th>25</th>
            <th>26</th>
            <th>27</th>
            <th>28</th>
            <th>29</th>
            <th>30</th>
            <th>31</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
            <th>6</th>
            <th>7</th>
            <th>8</th>
            <th>9</th>
            <th>10</th>
            <th>11</th>
            <th>12</th>
            <th>13</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="cell_header">2025-10-30</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF">2</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-29</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-28</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-27</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-26</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF">2</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-25</td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF">4</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-24</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF">6</td>
            <td class="FFFFFF">4</td>
            <td class="FFFFFF">4</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
    </tbody>
</table>
<table class="table-forecast-result table-forecast-result-global" summary="IFS ENS &gt; 5 yr RP">
    <caption>IFS ENS &gt; 5 yr RP</caption>
    <colgroup></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <colgroup class="egeGtHal"></colgroup>
    <thead>
        <tr>
            <th class="cell_header">Forecast Day</th>
            <th>24</th>
            <th>25</th>
            <th>26</th>
            <th>27</th>
            <th>28</th>
            <th>29</th>
            <th>30</th>
            <th>31</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
            <th>6</th>
            <th>7</th>
            <th>8</th>
            <th>9</th>
            <th>10</th>
            <th>11</th>
            <th>12</th>
            <th>13</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="cell_header">2025-10-30</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-29</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-28</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-27</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-26</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-25</td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-24</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF">2</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
    </tbody>
</table>
<table class="table-forecast-result table-forecast-result-global" summary="IFS ENS &gt; 20 yr RP">
    <caption>IFS ENS &gt; 20 yr RP</caption>
    <colgroup></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <colgroup class="egeGtEal"></colgroup>
    <thead>
        <tr>
            <th class="cell_header">Forecast Day</th>
            <th>24</th>
            <th>25</th>
            <th>26</th>
            <th>27</th>
            <th>28</th>
            <th>29</th>
            <th>30</th>
            <th>31</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
            <th>6</th>
            <th>7</th>
            <th>8</th>
            <th>9</th>
            <th>10</th>
            <th>11</th>
            <th>12</th>
            <th>13</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="cell_header">2025-10-30</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-29</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-28</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-27</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-26</td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-25</td>
            <td class="666666"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
        <tr>
            <td class="cell_header">2025-10-24</td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="FFFFFF"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
            <td class="666666"></td>
        </tr>
    </tbody>
</table>
`;
