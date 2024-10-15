// Attach file input click handler
document.getElementById('dragDropArea').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

// Prevent default behavior for drag and drop and provide visual hint
document.getElementById('dragDropArea').addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.add('drag-over');
});

document.getElementById('dragDropArea').addEventListener('dragleave', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.remove('drag-over');
});

document.getElementById('dragDropArea').addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.remove('drag-over'); // Remove visual hint

    const files = event.dataTransfer.files;
    handleFiles(files);
});

// Handle file input change event
document.getElementById('fileInput').addEventListener('change', (event) => {
    const files = event.target.files;
    handleFiles(files);
});

// Function to process dropped or selected files
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = async function (event) {
            const jsonText = event.target.result;
            await processFile(jsonText, files[i].name);
        };
        reader.readAsText(files[i]);
    }
}


// Process and validate each file
async function processFile(jsonText, fileName) {
    let json;
    try {
        json = JSON.parse(jsonText);
    } catch (error) {
        console.error('Invalid JSON:', error);
        return;
    }

    const resourceId = json.id || 'Unknown';
    const resourceName = json.name || 'Unknown';
    const resourceType = json.resourceType || 'Unknown';
    const selectedProfileUrl = document.getElementById('profileSelect').value;

    let validateUrl = `/fhir/${resourceType}/$validate`;

    // Improved validation logic:
    if (selectedProfileUrl && selectedProfileUrl !== 'Select a Profile') {
        validateUrl += `?profile=${encodeURIComponent(selectedProfileUrl)}`;
    } else if (json.meta && json.meta.profile && json.meta.profile.length > 0) {
        validateUrl += `?profile=${encodeURIComponent(json.meta.profile[0])}`;
    }

    // Perform the validation
    const response = await fetch(validateUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json'
        },
        body: jsonText
    });

    const validationData = await response.json();
    const { errorCount, warningCount, infoCount } = countValidationIssues(validationData);

    // Add a link to view the source in a modal
    const sourceLink = `<a href="#" onclick="showSourceModal('${encodeURIComponent(jsonText)}')">View Source</a>`;

    // Safely encode JSON for onclick handlers by converting it to a single line string
    const escapedJsonText = encodeURIComponent(jsonText);

    const rowHtml = `
        <tr>
            <td>${resourceId}</td>
            <td>${resourceName}</td>
            <td>${sourceLink}</td>
            <td><a href="./visualiser/index.html?url=${validateUrl}" target="_blank">Viewer</a></td>
            <td>
                <span class="error-count" onclick="showValidationModal('${validateUrl}', decodeURIComponent('${escapedJsonText}'), 'error')">${errorCount}</span>
                <span class="warning-count" onclick="showValidationModal('${validateUrl}', decodeURIComponent('${escapedJsonText}'), 'warning')">${warningCount}</span>
                <span class="info-count" onclick="showValidationModal('${validateUrl}', decodeURIComponent('${escapedJsonText}'), 'info')">${infoCount}</span>
            </td>
        </tr>
    `;
    document.getElementById('resultTableBody').insertAdjacentHTML('beforeend', rowHtml);
}




// Count validation issues (errors, warnings, info)
function countValidationIssues(validationData) {
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    if (validationData.issue) {
        validationData.issue.forEach((issue) => {
            if (issue.severity === 'error') errorCount++;
            else if (issue.severity === 'warning') warningCount++;
            else if (issue.severity === 'information') infoCount++;
        });
    }

    return { errorCount, warningCount, infoCount };
}

// Show validation modal with Liquid template rendering
function showValidationModal(validateUrl, jsonText, type) {
    const engine = new liquidjs.Liquid();

    // Fetch the Liquid template
    fetch('./outcome.liquid')
        .then(response => response.text())
        .then(template => {
            // Fetch the validation result and render it with Liquid
            fetch(validateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/fhir+json',
                    'Accept': 'application/fhir+json'
                },
                body: jsonText
            })
            .then(response => response.json())
            .then(data => {
                // Log the fetched JSON data and template for debugging
                console.log('Fetched JSON data:', data);
                console.log('Fetched Template:', template);

                // Encode JSON data safely before passing it into the Liquid engine
                const safeJsonData = JSON.parse(JSON.stringify(data));

                // Render the template using the safely encoded validation data
                engine.parseAndRender(template, safeJsonData)
                    .then(html => {
                        document.getElementById('validationResults').innerHTML = html;
                        const modal = new bootstrap.Modal(document.getElementById('resultModal'));
                        document.getElementById('resourceId').innerHTML = JSON.parse(jsonText).id;
                        modal.show();
                    })
                    .catch(error => {
                        console.error('Error rendering Liquid template:', error);
                        document.getElementById('validationResults').textContent = 'Error rendering template: ' + error;
                    });
            })
            .catch(error => {
                console.error('Error fetching validation result:', error);
                document.getElementById('validationResults').textContent = 'Error processing validation result: ' + error;
            });
        })
        .catch(error => {
            console.error('Error fetching Liquid template:', error);
            document.getElementById('validationResults').textContent = 'Error loading template: ' + error;
        });
}

// Show source JSON in a modal
function showSourceModal(encodedJson) {
    const jsonText = decodeURIComponent(encodedJson);
    document.getElementById('sourceContent').textContent = jsonText;
    const modal = new bootstrap.Modal(document.getElementById('sourceModal'));
    modal.show();
}

// Fetch profiles for validation
async function fetchProfiles() {
    try {
        const response = await fetch('/fhir/StructureDefinition?_format=json');
        if (!response.ok) throw new Error('Failed to fetch profiles');
        const data = await response.json();
        const select = document.getElementById('profileSelect');

        if (data.entry && data.entry.length > 0) {
            data.entry.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.resource.url;
                option.textContent = entry.resource.name;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No profiles available';
            option.disabled = true;
            select.appendChild(option);
            select.value = '';
        }
    } catch (error) {
        console.error('Error fetching profiles:', error);
    }
}

// Initialize profiles on page load
fetchProfiles();
