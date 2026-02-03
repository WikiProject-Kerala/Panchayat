function switchLanguage() {
  var selectedLanguage = document.getElementById("language-select").value;
  var elements = document.getElementsByClassName("lang");
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    if (selectedLanguage === "ml") {
      element.textContent = element.getAttribute("data-ml");
    } else if (selectedLanguage === "en") {
      element.textContent = element.getAttribute("data-en");
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var switchElement = document.querySelector('.lang-switch');
  switchElement.style.display = 'block';

  var langElements = document.querySelectorAll('.lang');
  for (var i = 0; i < langElements.length; i++) {
    langElements[i].addEventListener('click', function () {
      switchElement.style.display = 'inline';
    });
  }
});


// Global data storage
let lsgData = [];
let selectedYear = '2025';

const locationSelect = document.getElementById('location-select');
locationSelect.disabled = true;
const panchayatSelect = document.getElementById('panchayat-select');
const panchayatTable = document.getElementById('panchayat-table');
const populationTable = document.getElementById('population-table');
const panchayatData = document.getElementById('panchayat-data');
const populationData = document.getElementById('population-data');
const loadingAnimation = document.getElementById('loading-animation');
const selectedPanchayat = document.getElementById('selected-panchayat');
const wardsCountElement = document.getElementById('wards-count');
const yearRadios = document.querySelectorAll('input[name="year"]');

// Helper to clear displays
function clearDisplays() {
  selectedPanchayat.textContent = '';
  wardsCountElement.textContent = '';
  panchayatData.innerHTML = '';
  populationData.innerHTML = '';
  panchayatTable.style.display = 'none';
  populationTable.style.display = 'none';
}

// 1. Fetch ALL LSG Data from OpenDataKerala on Load (Federated Query)
function fetchAllLSGData() {
  loadingAnimation.style.display = 'flex';

  const sparqlQuery = `
            PREFIX wd:  <https://opendatakerala.wikibase.cloud/entity/>
            PREFIX wdt: <https://opendatakerala.wikibase.cloud/prop/direct/>
            PREFIX p:   <https://opendatakerala.wikibase.cloud/prop/>
            PREFIX ps:  <https://opendatakerala.wikibase.cloud/prop/statement/>
            PREFIX pq:  <https://opendatakerala.wikibase.cloud/prop/qualifier/>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX wikibase: <http://wikiba.se/ontology#>
            PREFIX bd: <http://www.bigdata.com/rdf#>
            # Wikidata Prefixes for Federation
            PREFIX wd_wd: <http://www.wikidata.org/entity/>
            PREFIX wd_wdt: <http://www.wikidata.org/prop/direct/>

            SELECT
            ?item
            ?ilen
            ?ilml
            ?district
            ?districtLabel
            ?SEC_Kerala_code
            ?LSG_localbody_code
            ?population
            ?malePopulation
            ?femalePopulation
            ?LGDcode
            # 2015: point in time = 2015 OR end time = 2025
            (COALESCE(
                SAMPLE(?no2015_pt),
                SAMPLE(?no2015_end)
            ) AS ?no_of_wards_2015)
            # 2025: start time = 2025, else fall back to 2015 value
            (COALESCE(
                SAMPLE(?no2025_start),
                COALESCE(
                SAMPLE(?no2015_pt),
                SAMPLE(?no2015_end)
                )
            ) AS ?no_of_wards_2025)
            WHERE {

            ?item wdt:P2 ?type .
            VALUES ?type { wd:Q969 wd:Q24 wd:Q967 wd:Q968 wd:Q1064 }

            OPTIONAL {
                ?item rdfs:label ?ilml .
                FILTER(LANG(?ilml) = "ml")
            }
            OPTIONAL {
                ?item rdfs:label ?ilen .
                FILTER(LANG(?ilen) = "en")
            }

            OPTIONAL { ?item wdt:P5  ?district . }
            OPTIONAL { ?item wdt:P21 ?SEC_Kerala_code . }
            OPTIONAL { ?item wdt:P20 ?LSG_localbody_code . }

            # Federation to fetch Population and LGD Code from Wikidata
            # Note: Must use Wikidata-specific prefixes inside SERVICE block
            OPTIONAL {
               SERVICE <https://query.wikidata.org/sparql> {
                   SELECT ?LSG_localbody_code ?population ?malePopulation ?femalePopulation ?LGDcode WHERE {
                       ?wdItem wd_wdt:P8573 ?LSG_localbody_code.
                       OPTIONAL { ?wdItem wd_wdt:P1082 ?population. }
                       OPTIONAL { ?wdItem wd_wdt:P1540 ?malePopulation. }
                       OPTIONAL { ?wdItem wd_wdt:P1539 ?femalePopulation. }
                       OPTIONAL { ?wdItem wd_wdt:P6425 ?LGDcode. }
                   }
               }
            }

            # -------- Wards for 2015 --------
            OPTIONAL {
                {
                # case 1: number of wards with point in time = 2015
                ?item p:P19 ?stmt2015_pt .
                ?stmt2015_pt ps:P19 ?no2015_pt .
                ?stmt2015_pt pq:P27 ?pt2015 .
                FILTER(YEAR(?pt2015) = 2015)
                }
                UNION
                {
                # case 2: number of wards with end time = 2025 (old wards, valid for 2015)
                ?item p:P19 ?stmt2015_end .
                ?stmt2015_end ps:P19 ?no2015_end .
                ?stmt2015_end pq:P29 ?end2025 .
                FILTER(YEAR(?end2025) = 2025)
                }
            }

            # -------- Wards for 2025 --------
            OPTIONAL {
                {
                # number of wards with start time = 2025 (new wards)
                ?item p:P19 ?stmt2025_start .
                ?stmt2025_start ps:P19 ?no2025_start .
                ?stmt2025_start pq:P28 ?start2025 .
                FILTER(YEAR(?start2025) = 2025)
                }
            }

            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en".
            }
            }
            GROUP BY
            ?item
            ?ilen
            ?ilml
            ?district
            ?districtLabel
            ?SEC_Kerala_code
            ?LSG_localbody_code
            ?population
            ?malePopulation
            ?femalePopulation
            ?LGDcode
          `;

  const endpointUrl = 'https://opendatakerala.wikibase.cloud/query/sparql';

  fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'query=' + encodeURIComponent(sparqlQuery)
  })
    .then(response => response.json())
    .then(data => {
      lsgData = data.results.bindings;
      loadingAnimation.style.display = 'none';
      // Enable district selection
      locationSelect.disabled = false;
    })
    .catch(error => {
      console.error('Error fetching ODK data:', error);
      loadingAnimation.style.display = 'none';
      selectedPanchayat.textContent = "Error loading data. Please refresh.";
    });
}

// 2. Populate Panchayat Dropdown based on District Selection
function populatePanchayatList() {
  const selectedDistrictId = locationSelect.value; // internal code like Q1419703
  const selectedOption = locationSelect.options[locationSelect.selectedIndex];
  const districtNameEn = selectedOption.getAttribute('data-en');
  const districtNameMl = selectedOption.getAttribute('data-ml');
  const curLang = document.getElementById("language-select").value;

  if (!selectedDistrictId || !lsgData.length) {
    panchayatSelect.innerHTML = '<option value="">-----</option>';
    panchayatSelect.disabled = true;
    clearDisplays();
    document.getElementById('selected-location').textContent = '';
    return;
  }

  document.getElementById('selected-location').textContent = `${selectedOption.text} ജില്ല`;

  // Filter lsgData. We need to match district. 
  const filtered = lsgData.filter(item => {
    if (!item.districtLabel) return false;
    // Check if districtLabel matches the English name of selected district
    return item.districtLabel.value === districtNameEn;
  });

  // Sort by label
  filtered.sort((a, b) => {
    const labelA = curLang === 'ml' ? (a.ilml?.value || a.ilen?.value) : (a.ilen?.value || a.ilml?.value);
    const labelB = curLang === 'ml' ? (b.ilml?.value || b.ilen?.value) : (b.ilen?.value || b.ilml?.value);
    return (labelA || '').localeCompare(labelB || '');
  });

  panchayatSelect.innerHTML = '<option value="">Select Panchayat</option>';
  filtered.forEach(item => {
    const label = curLang === 'ml' ? (item.ilml?.value || item.ilen?.value) : (item.ilen?.value || item.ilml?.value);
    const option = document.createElement('option');
    option.value = item.item.value; // Store URI as value
    option.textContent = label || "Unknown";
    panchayatSelect.appendChild(option);
  });

  panchayatSelect.disabled = false;
  clearDisplays();
}

// 3. Display Selected Panchayat Data (Core + Wikidata fetch)
function displaySelectedPanchayat() {
  const uri = panchayatSelect.value;
  if (!uri) {
    clearDisplays();
    return;
  }

  const item = lsgData.find(d => d.item.value === uri);
  if (!item) return;

  const curLang = document.getElementById("language-select").value;
  const label = curLang === 'ml' ? (item.ilml?.value || item.ilen?.value) : (item.ilen?.value || item.ilml?.value);

  selectedPanchayat.textContent = label;

  // Wards
  const count = selectedYear === '2015' ? (item.no_of_wards_2015?.value) : (item.no_of_wards_2025?.value);
  wardsCountElement.textContent = count || "N/A";

  // Core Data Table (LSG, SEC)
  const lsgCode = item.LSG_localbody_code?.value || "N/A";
  const secCode = item.SEC_Kerala_code?.value || "N/A";
  const lgdCode = item.LGDcode?.value || "N/A";

  panchayatData.innerHTML = `
             <tr>
               <td class="has-text-centered">${lgdCode}</td>
               <td class="has-text-centered">${lsgCode}</td>
               <td class="has-text-centered">${secCode}</td>
             </tr>
          `;
  panchayatTable.style.display = 'block';

  // Population Table
  const pop = item.population?.value || "N/A";
  const mal = item.malePopulation?.value || "N/A";
  const fem = item.femalePopulation?.value || "N/A";

  const populationRow = `
            <tr>
              <td class="has-text-centered">${pop}</td>
              <td class="has-text-centered">${mal}</td>
              <td class="has-text-centered">${fem}</td>
            </tr>
          `;
  populationData.innerHTML = populationRow;
  populationTable.style.display = 'block';
}

// Event Listeners
locationSelect.addEventListener('change', populatePanchayatList);
panchayatSelect.addEventListener('change', displaySelectedPanchayat);

yearRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    selectedYear = e.target.value;
    displaySelectedPanchayat(); // Refresh display
  });
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  fetchAllLSGData();
});


function toggleSidenav() {
  var locationDropdown = document.getElementById("location-select");
  var panchayatDropdown = document.getElementById("panchayat-select");
  var sidenav = document.getElementById("mySidenav");

  if (locationDropdown.value === "") {
    sidenav.style.display = "none";
  } else if (panchayatDropdown.value !== "") {
    sidenav.style.display = "block";
  } else {
    sidenav.style.display = "none";
  }
}

window.addEventListener("DOMContentLoaded", function () {
  var locationDropdown = document.getElementById("location-select");
  locationDropdown.addEventListener("change", toggleSidenav);

  var panchayatDropdown = document.getElementById("panchayat-select");
  panchayatDropdown.addEventListener("change", toggleSidenav);

  var sidenav = document.getElementById("mySidenav");
  sidenav.style.display = "none";
});

// Set panchayatSelect as disabled initially
panchayatSelect.disabled = true;
panchayatTable.style.display = 'block';
populationTable.style.display = 'none';
