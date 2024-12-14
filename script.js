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

document.addEventListener('DOMContentLoaded', function() {
  var switchElement = document.querySelector('.lang-switch');
  switchElement.style.display = 'block';

  var langElements = document.querySelectorAll('.lang');
  for (var i = 0; i < langElements.length; i++) {
    langElements[i].addEventListener('click', function() {
      switchElement.style.display = 'inline';
    });
  }
});


      const locationSelect = document.getElementById('location-select');
      const panchayatSelect = document.getElementById('panchayat-select');
      const panchayatTable = document.getElementById('panchayat-table');
      const populationTable = document.getElementById('population-table');
      const panchayatData = document.getElementById('panchayat-data');
      const populationData = document.getElementById('population-data');
      const loadingAnimation = document.getElementById('loading-animation');

      function fetchPanchayatList() {
        const selectedLocation = locationSelect.value;
        const selectedLocationText = locationSelect.options[locationSelect.selectedIndex].text;
        const selectedLanguage = document.getElementById("language-select").value;
        if (selectedLocation) {
          document.getElementById('selected-location').textContent = `${selectedLocationText} ജില്ല`;
          const sparqlQueryList = `
            SELECT ?panchayat ?panchayatLabel
            WHERE {
             {?panchayat wdt:P31 wd:Q2732840.}
              UNION
             {?panchayat wdt:P31 wd:Q4927168.}
              UNION
             {?panchayat wdt:P31 wd:Q2758248.}
              ?panchayat wdt:P131 wd:${selectedLocation};
                        	rdfs:label ?panchayatLabel.
              FILTER(LANG(?panchayatLabel) = '${selectedLanguage}')
            }
            ORDER BY ?panchayatLabel
            LIMIT 200
          `;

          const url = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?query=${encodeURIComponent(sparqlQueryList)}`;

          fetch(url, {
            headers: {
              'Accept': 'application/json'
            }
          })
            .then(response => response.json())
            .then(data => {
              const results = data.results.bindings;
              panchayatSelect.innerHTML = '<option value="">_____</option>';
              results.forEach(result => {
                const panchayatURI = result.panchayat.value;
                const panchayatLabel = result.panchayatLabel.value;
                const option = document.createElement('option');
                option.value = panchayatURI;
                option.textContent = panchayatLabel;
                panchayatSelect.appendChild(option);
              });
              panchayatSelect.disabled = false;
          panchayatTable.style.display = 'none';
          populationTable.style.display = 'none';
            })
            .catch(error => {
              console.error('Error:', error);
            });
        } else {
          document.getElementById('selected-location').textContent = '';
          panchayatSelect.innerHTML = '<option value="">-----</option>';
          panchayatSelect.disabled = true;
          panchayatTable.style.display = 'none';
          populationTable.style.display = 'none';
} }

const selectedPanchayat = document.getElementById('selected-panchayat');
const wardsCountElement = document.getElementById('wards-count');

function displaySelectedPanchayat() {
          if (locationSelect.value !== '') {
    selectedPanchayat.textContent = '';
    wardsCountElement.textContent = '';
  	} else {
    	const selectedPanchayatOption = panchayatSelect.options[panchayatSelect.selectedIndex];
    	const selectedPanchayatLabel = selectedPanchayatOption.textContent;
    	selectedPanchayat.textContent = selectedPanchayatLabel;
	wardsCountElement.textContent = wardsCount;
  	}
}

panchayatSelect.addEventListener('change', displaySelectedPanchayat);
locationSelect.addEventListener('change', displaySelectedPanchayat);

      function fetchPanchayatData() {
        const selectedPanchayatURI = panchayatSelect.value;
        const selectedLanguage = document.getElementById("language-select").value;
        if (selectedPanchayatURI) {
          const sparqlQueryData = `
            SELECT ?panchayatLabel ?population ?malePopulation ?femalePopulation ?LGDcode ?LSGcode ?SECcode (COUNT(?wards) AS ?wardsCount)
            WHERE {
              <${selectedPanchayatURI}> rdfs:label ?panchayatLabel.
               OPTIONAL { <${selectedPanchayatURI}> wdt:P1082 ?population }.
               OPTIONAL { <${selectedPanchayatURI}> wdt:P1540 ?malePopulation }.
               OPTIONAL { <${selectedPanchayatURI}> wdt:P1539 ?femalePopulation }.
               OPTIONAL { <${selectedPanchayatURI}> wdt:P6425 ?LGDcode }.
               OPTIONAL { <${selectedPanchayatURI}> wdt:P8573 ?LSGcode }.
               OPTIONAL { <${selectedPanchayatURI}> wdt:P11817 ?SECcode }.
              FILTER(LANG(?panchayatLabel) = '${selectedLanguage}')
              	{ SELECT ?wards
                      WHERE {
                            ?wards wdt:P31 wd:Q1195098;
                                   p:P31 ?id.
                            ?id pq:P131 <${selectedPanchayatURI}>.
             	}
              LIMIT 150
            	}
            }
          GROUP BY ?panchayatLabel ?population ?malePopulation ?femalePopulation ?LGDcode ?LSGcode ?SECcode
            LIMIT 1
          `;

          const url = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?query=${encodeURIComponent(sparqlQueryData)}`;

          panchayatTable.style.display = 'none';
          populationTable.style.display = 'none';
          loadingAnimation.style.display = 'flex';

          const wardsCountElement = document.getElementById('wards-count');

          fetch(url, {
            headers: {
              'Accept': 'application/json'
            }
          })
            .then(response => response.json())
            .then(data => {
              const panchayat = data.results.bindings[0];
              if (panchayat) {
                const panchayatLabel = panchayat.panchayatLabel?.value || 'N/A';
                const wardsCount = panchayat.wardsCount?.value || 'N/A';
                const population = panchayat.population?.value || 'N/A';
                const malePopulation = panchayat.malePopulation?.value || 'N/A';
                const femalePopulation = panchayat.femalePopulation?.value || 'N/A';
                const LGDcode = panchayat.LGDcode?.value || 'N/A';
                const LSGcode = panchayat.LSGcode?.value || 'N/A';
                const SECcode = panchayat.SECcode?.value || 'N/A';

                // Set the wardsCount value and Panchayat Label
                wardsCountElement.textContent = wardsCount;

                selectedPanchayat.textContent = panchayatLabel;

                const panchayatRow = `
                  <tr>
                    <td class="has-text-centered">${LGDcode}</td>
                    <td class="has-text-centered">${LSGcode}</td>
                    <td class="has-text-centered">${SECcode}</td>
                  </tr>
                `;
                panchayatData.innerHTML = panchayatRow;

                const populationRow = `
                  <tr>
                    <td class="has-text-centered">${population}</td>
                    <td class="has-text-centered">${malePopulation}</td>
                    <td class="has-text-centered">${femalePopulation}</td>
                  </tr>
                `;
                populationData.innerHTML = populationRow;

                panchayatTable.style.display = 'block';
                populationTable.style.display = 'block';
              } else {
                panchayatData.innerHTML = '<tr><td colspan="3">ഡാറ്റ കണ്ടെത്തിയില്ല</td></tr>';
                populationData.innerHTML = '<tr><td colspan="3">ഡാറ്റ കണ്ടെത്തിയില്ല</td></tr>';
                panchayatTable.style.display = 'none';
                populationTable.style.display = 'none';
              }

              loadingAnimation.style.display = 'none';
            })
            
        } else {
         selectedPanchayat.textContent = '';
          panchayatData.innerHTML = '';
          populationData.innerHTML = '';
          panchayatTable.style.display = 'none';
          populationTable.style.display = 'none';
        }
      }
      locationSelect.addEventListener('change', fetchPanchayatList);
      panchayatSelect.addEventListener('change', fetchPanchayatData);

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

window.addEventListener("DOMContentLoaded", function() {
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
