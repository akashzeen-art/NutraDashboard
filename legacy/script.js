// Global state
let currentProductId = null; // Currently selected product ID
let selectedDate = null;
let contactsData = [];
let analyticsData = null;
let apiResponseData = null; // Store full API response
let availableProducts = []; // Store available products from API

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://pu.playtonight.fun',
    endpoint: '/api/payment/report/bucket-wise'
};

// Authentication credentials
const AUTH_CREDENTIALS = {
    email: 'admin@gmail.com',
    password: 'Admin@123'
};

// Check authentication status
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
        showDashboard();
    } else {
        showLogin();
    }
}

// Show login page
function showLogin() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');
}

// Show dashboard
function showDashboard() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    if (loginContainer) loginContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    // Clear previous error
    if (errorDiv) errorDiv.textContent = '';
    
    // Validate credentials
    if (email === AUTH_CREDENTIALS.email && password === AUTH_CREDENTIALS.password) {
        // Set authentication status
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userEmail', email);
        
        // Show dashboard
        showDashboard();
        
        // Initialize dashboard if not already initialized
        if (!dashboardInitialized) {
            initializeEventListeners();
            setDefaultDate();
            dashboardInitialized = true;
        }
    } else {
        // Show error
        if (errorDiv) errorDiv.textContent = 'Invalid email or password. Please try again.';
        const passwordInput = document.getElementById('password');
        if (passwordInput) passwordInput.value = '';
    }
}

// Handle logout
function logout() {
    // Clear authentication
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userEmail');
    
    // Show login page
    showLogin();
    
    // Clear form
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    if (loginForm) loginForm.reset();
    if (errorDiv) errorDiv.textContent = '';
}

// Make logout function globally accessible
window.logout = logout;

// Track if dashboard is initialized
let dashboardInitialized = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set up login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check authentication status
    checkAuth();
    
    // If authenticated, initialize dashboard
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
        initializeEventListeners();
        setDefaultDate();
        dashboardInitialized = true;
    }
});

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-picker').value = today;
    selectedDate = today;
}

// Initialize all event listeners
function initializeEventListeners() {
    // Date picker
    document.getElementById('date-picker').addEventListener('change', function(e) {
        selectedDate = e.target.value;
    });

    // Fetch data button
    document.getElementById('fetch-data-btn').addEventListener('click', fetchAllData);

    // Modal close
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.getElementById('contact-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // CSV download buttons
    document.getElementById('download-contacts-csv').addEventListener('click', downloadContactsCSV);
    document.getElementById('download-analytics-csv').addEventListener('click', downloadAnalyticsCSV);
}

// Switch between products using productId
function switchProduct(productId) {
    currentProductId = productId;
    
    // Update button states
    document.querySelectorAll('.product-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.productId) === productId) {
            btn.classList.add('active');
        }
    });
    
    // Process data for the selected product if we have API data
    if (apiResponseData && Array.isArray(apiResponseData)) {
        processApiData(apiResponseData);
    }
}

// Fetch all data (contacts and analytics)
async function fetchAllData() {
    if (!selectedDate) {
        alert('Please select a date first');
        return;
    }

    try {
        // Show loading state
        showLoading();

        // Fetch data from API
        const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}?date=${selectedDate}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        apiResponseData = data;

        // Extract available products from API response
        if (Array.isArray(data) && data.length > 0) {
            availableProducts = data.map(item => ({
                productId: item.productId,
                productName: item.productName
            }));
            
            // Generate product buttons dynamically
            generateProductButtons(availableProducts);
            
            // Select first product by default if none selected
            if (!currentProductId && availableProducts.length > 0) {
                currentProductId = availableProducts[0].productId;
            }
        } else {
            availableProducts = [];
            generateProductButtons([]);
        }

        // Process data for current product
        processApiData(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error fetching data. Please check the console for details.');
        contactsData = [];
        analyticsData = null;
        displayContacts([]);
        displayAnalytics(null);
    } finally {
        hideLoading();
    }
}

// Generate product buttons dynamically from API response
function generateProductButtons(products) {
    const productButtonsContainer = document.querySelector('.product-buttons');
    
    if (!products || products.length === 0) {
        productButtonsContainer.innerHTML = '<p class="no-products">No products available</p>';
        return;
    }

    productButtonsContainer.innerHTML = products.map((product, index) => {
        const isActive = currentProductId === product.productId || (index === 0 && !currentProductId);
        if (isActive && !currentProductId) {
            currentProductId = product.productId;
        }
        return `
            <button class="product-btn ${isActive ? 'active' : ''}" 
                    data-product-id="${product.productId}" 
                    onclick="switchProduct(${product.productId})">
                ${product.productName}
            </button>
        `;
    }).join('');
}

// Process API data for the selected product
function processApiData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        contactsData = [];
        analyticsData = null;
        displayContacts([]);
        displayAnalytics(null);
        return;
    }

    // If no product is selected, select the first one
    if (!currentProductId && data.length > 0) {
        currentProductId = data[0].productId;
    }

    // Find the product data matching current selection
    const productData = data.find(item => item.productId === currentProductId);

    if (!productData) {
        contactsData = [];
        analyticsData = null;
        displayContacts([]);
        displayAnalytics(null);
        return;
    }

    // Extract contacts from msisdnList
    contactsData = (productData.user?.msisdnList || []).map(msisdn => ({
        mobile: msisdn
    }));

    // Process analytics data
    analyticsData = {
        productName: productData.productName,
        date: productData.date,
        dsp: productData.dsp,
        hours: productData.hours || []
    };

    // Display the data
    displayContacts(contactsData);
    displayAnalytics(analyticsData);
}

// Fetch contacts from API (now handled in fetchAllData)
async function fetchContacts() {
    // This function is kept for compatibility but data is now fetched in fetchAllData
    // Contacts are extracted from the API response in processApiData
}

// Fetch contact details from API
async function fetchContactDetails(mobileNumber) {
    try {
        // Replace with actual API call
        const response = await mockApiCall('contactDetails', {
            productId: currentProductId,
            mobile: mobileNumber
        });

        displayContactDetails(response);
        openModal();
    } catch (error) {
        console.error('Error fetching contact details:', error);
        alert('Error fetching contact details');
    }
}

// Fetch analytics from API (now handled in fetchAllData)
async function fetchAnalytics() {
    // This function is kept for compatibility but data is now fetched in fetchAllData
    // Analytics are extracted from the API response in processApiData
}

// Display contacts in the list
function displayContacts(contacts) {
    const contactList = document.getElementById('contact-list');
    
    if (!contacts || contacts.length === 0) {
        contactList.innerHTML = '<p class="no-data">No contacts found for the selected date</p>';
        return;
    }

    contactList.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <span class="contact-mobile">${contact.mobile || contact.phone || 'N/A'}</span>
            <button class="view-btn" onclick="fetchContactDetails('${contact.mobile || contact.phone}')">View</button>
        </div>
    `).join('');
}

// Display contact details in modal
function displayContactDetails(details) {
    const detailsContainer = document.getElementById('contact-details');
    
    detailsContainer.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Phone Number*</span>
            <span class="detail-value">${details.phone || details.mobile || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Email*</span>
            <span class="detail-value">${details.email || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">First Name*</span>
            <span class="detail-value">${details.firstName || details.first_name || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Last Name*</span>
            <span class="detail-value">${details.lastName || details.last_name || 'N/A'}</span>
        </div>
    `;
}

// Display analytics in table
function displayAnalytics(data) {
    if (!data || !data.hours || data.hours.length === 0) {
        // Reset table to default state
        document.getElementById('analytics-date').textContent = '-';
        document.getElementById('dsp-name').textContent = '-';
        resetAnalyticsTable();
        return;
    }

    // Update header
    document.getElementById('analytics-date').textContent = formatDate(data.date || selectedDate);
    document.getElementById('dsp-name').textContent = data.dsp || '-';

    // Create a map of hour data
    const hourMap = {};
    data.hours.forEach(hour => {
        hourMap[hour.hourTime] = hour;
    });

    // Map API time slots to table time slots (they now match exactly)
    const tableTimeSlots = ['00:00-04:00', '04:00-12:00', '12:00-16:00', '16:00-20:00', '20:00-24:00'];
    
    // Helper function to get value for a time slot
    function getValueForTimeSlot(timeSlot, metric) {
        if (hourMap[timeSlot]) {
            return hourMap[timeSlot][metric] || 0;
        }
        return 0;
    }

    // Update table data
    const table = document.getElementById('analytics-table');
    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');

    // Map metrics to API fields
    const metricMap = [
        { name: 'Clicks', field: 'clicks' },
        { name: 'Entry – Mobile No', field: 'clicks' }, // Using clicks as entry count
        { name: 'Payment Initiate', field: 'initiatedCount' },
        { name: 'Payment Failed', field: 'failureCount' },
        { name: 'Success/Conversion', field: 'successCount' }
    ];

    // Process metric rows (excluding CR% row which is last)
    rows.forEach((row, rowIndex) => {
        // Skip CR% row (last row) - we'll handle it separately
        if (rowIndex >= metricMap.length) {
            return;
        }

        const metric = metricMap[rowIndex];
        const cells = row.querySelectorAll('td');
        
        let total = 0;
        
        // Calculate total first by going through all time slots
        tableTimeSlots.forEach(timeSlot => {
            let value = '-';
            if (metric.field === 'clicks' && metric.name === 'Entry – Mobile No') {
                value = getValueForTimeSlot(timeSlot, 'clicks');
            } else {
                value = getValueForTimeSlot(timeSlot, metric.field);
            }
            if (typeof value === 'number') {
                total += value;
            }
        });
        
        // Update total cell (second cell, index 1)
        const totalCell = cells[1];
        if (totalCell) {
            totalCell.textContent = total;
        }
        
        // Update time slot cells (starting from index 2)
        for (let i = 0; i < tableTimeSlots.length; i++) {
            const timeSlot = tableTimeSlots[i];
            const cellIndex = i + 2; // +2 because first is metric name, second is total
            let value = '-';
            
            if (metric.field === 'clicks' && metric.name === 'Entry – Mobile No') {
                // Entry count is same as clicks
                value = getValueForTimeSlot(timeSlot, 'clicks');
            } else {
                value = getValueForTimeSlot(timeSlot, metric.field);
            }
            
            if (cells[cellIndex]) {
                cells[cellIndex].textContent = value === 0 ? 0 : (value || '-');
            }
        }
    });

    // Handle CR% row (last row)
    // Formula: CR% = (Conversions ÷ Clicks) × 100
    if (rows.length > metricMap.length) {
        const crRow = rows[rows.length - 1];
        const crCells = crRow.querySelectorAll('td');
        
        // Calculate total clicks and total conversions
        let totalClicks = 0;
        let totalConversions = 0;
        tableTimeSlots.forEach(timeSlot => {
            const clicks = getValueForTimeSlot(timeSlot, 'clicks');
            const conversions = getValueForTimeSlot(timeSlot, 'successCount');
            if (typeof clicks === 'number') totalClicks += clicks;
            if (typeof conversions === 'number') totalConversions += conversions;
        });
        
        // Calculate total CR%: (Total Conversions ÷ Total Clicks) × 100
        const totalCR = totalClicks > 0 
            ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%'
            : '0.00%';
        
        // Update total CR% cell
        if (crCells[1]) {
            crCells[1].textContent = totalCR;
        }
        
        // Update CR% for each time slot: (Conversions ÷ Clicks) × 100
        for (let i = 0; i < tableTimeSlots.length; i++) {
            const timeSlot = tableTimeSlots[i];
            const cellIndex = i + 2;
            const clicks = getValueForTimeSlot(timeSlot, 'clicks');
            const conversions = getValueForTimeSlot(timeSlot, 'successCount');
            // CR% = (Conversions ÷ Clicks) × 100
            const cr = clicks > 0 
                ? ((conversions / clicks) * 100).toFixed(2) + '%'
                : '0.00%';
            
            if (crCells[cellIndex]) {
                crCells[cellIndex].textContent = cr;
            }
        }
    }
}

// Reset analytics table to default state
function resetAnalyticsTable() {
    const table = document.getElementById('analytics-table');
    const tbody = table.querySelector('tbody');
    const cells = tbody.querySelectorAll('td:not(:first-child)');
    cells.forEach(cell => {
        cell.textContent = '-';
    });
}

// Open modal
function openModal() {
    document.getElementById('contact-modal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('contact-modal').style.display = 'none';
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Download Contacts Excel
function downloadContactsCSV() {
    if (!contactsData || contactsData.length === 0) {
        alert('No contact data available to download');
        return;
    }

    // Get all contact details (if available) or use basic data
    const excelData = contactsData.map(contact => ({
        'Mobile Number': contact.mobile || contact.phone || '',
        'Email': contact.email || '',
        'First Name': contact.firstName || contact.first_name || '',
        'Last Name': contact.lastName || contact.last_name || ''
    }));

    const productName = analyticsData?.productName || 'product';
    const safeProductName = productName.toLowerCase().replace(/\s+/g, '_');
    generateExcel(excelData, `contacts_${safeProductName}_${selectedDate}.xlsx`);
}

// Download Analytics Excel
function downloadAnalyticsCSV() {
    if (!analyticsData || !analyticsData.hours) {
        alert('No analytics data available to download');
        return;
    }

    const tableTimeSlots = ['00:00-04:00', '04:00-12:00', '12:00-16:00', '16:00-20:00', '20:00-24:00'];
    
    // Create a map of hour data
    const hourMap = {};
    analyticsData.hours.forEach(hour => {
        hourMap[hour.hourTime] = hour;
    });

    // Helper function to get value for a time slot
    function getValueForTimeSlot(timeSlot, metric) {
        if (hourMap[timeSlot]) {
            return hourMap[timeSlot][metric] || 0;
        }
        return 0;
    }

    // Prepare data for Excel
    const excelData = [];
    
    // Add header row
    excelData.push(['Metric', 'Total', ...tableTimeSlots]);

    // Data rows
    const metrics = [
        { name: 'Clicks', field: 'clicks' },
        { name: 'Entry – Mobile No', field: 'clicks' },
        { name: 'Payment Initiate', field: 'initiatedCount' },
        { name: 'Payment Failed', field: 'failureCount' },
        { name: 'Success/Conversion', field: 'successCount' }
    ];

    metrics.forEach(metric => {
        const row = [metric.name];
        let total = 0;
        
        // Calculate total first
        tableTimeSlots.forEach(timeSlot => {
            let value = '-';
            if (metric.name === 'Entry – Mobile No') {
                value = getValueForTimeSlot(timeSlot, 'clicks');
            } else {
                value = getValueForTimeSlot(timeSlot, metric.field);
            }
            if (typeof value === 'number') {
                total += value;
            }
        });
        
        row.push(total); // Add total as second column
        
        // Add time slot values
        tableTimeSlots.forEach(timeSlot => {
            let value = '-';
            if (metric.name === 'Entry – Mobile No') {
                value = getValueForTimeSlot(timeSlot, 'clicks');
            } else {
                value = getValueForTimeSlot(timeSlot, metric.field);
            }
            row.push(value === 0 ? 0 : (value || '-'));
        });
        
        excelData.push(row);
    });

    // Add CR% row
    // Formula: CR% = (Conversions ÷ Clicks) × 100
    let totalClicks = 0;
    let totalConversions = 0;
    tableTimeSlots.forEach(timeSlot => {
        const clicks = getValueForTimeSlot(timeSlot, 'clicks');
        const conversions = getValueForTimeSlot(timeSlot, 'successCount');
        if (typeof clicks === 'number') totalClicks += clicks;
        if (typeof conversions === 'number') totalConversions += conversions;
    });
    // Total CR%: (Total Conversions ÷ Total Clicks) × 100
    const totalCR = totalClicks > 0 
        ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%'
        : '0.00%';
    
    const crRow = ['CR%', totalCR];
    tableTimeSlots.forEach(timeSlot => {
        const clicks = getValueForTimeSlot(timeSlot, 'clicks');
        const conversions = getValueForTimeSlot(timeSlot, 'successCount');
        // CR% = (Conversions ÷ Clicks) × 100
        const cr = clicks > 0 
            ? ((conversions / clicks) * 100).toFixed(2) + '%'
            : '0.00%';
        crRow.push(cr);
    });
    excelData.push(crRow);

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
    
    // Download the file
    const productName = analyticsData?.productName || 'product';
    const safeProductName = productName.toLowerCase().replace(/\s+/g, '_');
    XLSX.writeFile(wb, `analytics_${safeProductName}_${selectedDate}.xlsx`);
}

// Generate and download Excel
function generateExcel(data, filename) {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data array to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const maxWidth = 50;
    const colWidths = Object.keys(data[0]).map(() => ({ wch: maxWidth }));
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    
    // Download the file
    XLSX.writeFile(wb, filename);
}

// Show loading state
function showLoading() {
    const fetchBtn = document.getElementById('fetch-data-btn');
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Loading...';
}

// Hide loading state
function hideLoading() {
    const fetchBtn = document.getElementById('fetch-data-btn');
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch Data';
}

// Mock API call - Replace with actual API calls
async function mockApiCall(endpoint, params) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data based on endpoint
    switch (endpoint) {
        case 'contacts':
            return {
                contacts: [
                    { mobile: '9999999999' },
                    { mobile: '8888888888' },
                    { mobile: '7777777777' },
                    { mobile: '6666666666' }
                ]
            };

        case 'contactDetails':
            return {
                phone: params.mobile,
                email: `user${params.mobile.slice(-4)}@example.com`,
                firstName: 'John',
                lastName: 'Doe'
            };

        case 'analytics':
            return {
                dspName: `${params.product.toUpperCase()} DSP Link`,
                clicks: {
                    '00:00-04:00': 100,
                    '04:00-08:00': 150,
                    '08:00-12:00': 200,
                    '12:00-16:00': 180,
                    '16:00-20:00': 220,
                    '20:00-24:00': 160
                },
                entryMobile: {
                    '00:00-04:00': 20,
                    '04:00-08:00': 30,
                    '08:00-12:00': 40,
                    '12:00-16:00': 35,
                    '16:00-20:00': 45,
                    '20:00-24:00': 32
                },
                paymentInitiate: {
                    '00:00-04:00': 10,
                    '04:00-08:00': 15,
                    '08:00-12:00': 20,
                    '12:00-16:00': 18,
                    '16:00-20:00': 22,
                    '20:00-24:00': 16
                },
                dropOff: {
                    '00:00-04:00': 5,
                    '04:00-08:00': 7,
                    '08:00-12:00': 8,
                    '12:00-16:00': 6,
                    '16:00-20:00': 9,
                    '20:00-24:00': 5
                },
                paymentFailed: {
                    '00:00-04:00': 2,
                    '04:00-08:00': 3,
                    '08:00-12:00': 4,
                    '12:00-16:00': 3,
                    '16:00-20:00': 5,
                    '20:00-24:00': 2
                },
                success: {
                    '00:00-04:00': 3,
                    '04:00-08:00': 5,
                    '08:00-12:00': 8,
                    '12:00-16:00': 9,
                    '16:00-20:00': 8,
                    '20:00-24:00': 9
                }
            };

        default:
            throw new Error('Unknown endpoint');
    }
}

// Actual API call function (replace mockApiCall with this when APIs are ready)
async function actualApiCall(endpoint, params) {
    let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
    
    // Replace URL parameters
    if (endpoint === 'getContactDetails') {
        url = url.replace('{mobile}', params.mobile);
    }
    
    // Add query parameters
    const queryParams = new URLSearchParams();
    if (params.product) queryParams.append('product', params.product);
    if (params.date) queryParams.append('date', params.date);
    
    if (queryParams.toString()) {
        url += '?' + queryParams.toString();
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            // Add authentication headers if needed
            // 'Authorization': 'Bearer YOUR_TOKEN'
        }
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Export functions for global access
window.fetchContactDetails = fetchContactDetails;
window.switchProduct = switchProduct;

