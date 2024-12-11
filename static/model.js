const backendUrl = 'https://crop-price-meqh.onrender.com'; // Backend URL for Render
let chartInstance; // Global variable to store the Chart.js instance

// Utility function to toggle loading spinner and button states
const toggleLoading = (isLoading) => {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = isLoading ? 'block' : 'none';
    toggleButtonState(isLoading);
};

const toggleButtonState = (isDisabled) => {
    document.querySelectorAll('button').forEach(btn => btn.disabled = isDisabled);
};

// Show error messages
const showError = (message) => {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.style.color = 'red';
};

// Clear the result text
const clearResult = () => {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = '';
};

// Fetch vegetables and populate dropdown
const fetchVegetables = async () => {
    try {
        const response = await fetch(`${backendUrl}/get_vegetables`);
        if (!response.ok) {
            throw new Error('Failed to fetch vegetables');
        }
        const vegetables = await response.json();
        const dropdown = document.getElementById('vegetableDropdown');
        dropdown.innerHTML = ''; // Clear existing options
        vegetables.forEach(veg => {
            const option = document.createElement('option');
            option.value = veg;
            option.textContent = veg;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching vegetables:', error);
        showError('Failed to load vegetable options. Please try again.');
    }
};

// Handle vegetable selection change
document.getElementById('vegetableDropdown').addEventListener('change', () => {
    clearResult(); // Clear the result text when selection changes
    const selectedVeg = document.getElementById('vegetableDropdown').value;
    if (selectedVeg) {
        fetchHistoricalData(selectedVeg); // Fetch and render the historical chart for the new selection
    }
});

// Predict Price
document.getElementById('predictBtn').addEventListener('click', async () => {
    const selectedVeg = document.getElementById('vegetableDropdown').value;
    const resultDiv = document.getElementById('result');

    if (!selectedVeg) {
        alert('Please select a vegetable!');
        return;
    }

    toggleLoading(true);
    clearResult(); // Clear previous prediction before making a new one

    try {
        const response = await fetch(`${backendUrl}/predict_price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vegetable: selectedVeg })
        });

        if (!response.ok) {
            throw new Error('Failed to predict price');
        }

        const data = await response.json();
        toggleLoading(false);
        resultDiv.innerHTML = `<strong>Predicted price for ${selectedVeg} is ₹${data.predicted_price}</strong>`;
    } catch (error) {
        toggleLoading(false);
        showError('An error occurred. Please try again.');
        console.error('Error predicting price:', error);
    }
});

// Fetch Historical Data and Render Chart
const fetchHistoricalData = async (vegetable) => {
    toggleLoading(true);

    try {
        const response = await fetch(`${backendUrl}/get_historical_data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vegetable })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch historical data');
        }

        const data = await response.json();

        if (data.length === 0) {
            toggleLoading(false);
            showError(`No historical data available for ${vegetable}.`);
            return;
        }

        const labels = data.map(item => item.Date);
        const prices = data.map(item => item.Average);

        const ctx = document.getElementById('priceTrendChart').getContext('2d');

        // Destroy existing chart instance if it exists
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Create a new Chart.js instance
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Price Trend of ${vegetable}`,
                    data: prices,
                    borderColor: '#2c6e49', // Dark Green
                    backgroundColor: 'rgba(44, 110, 73, 0.2)', // Light Green
                    borderWidth: 2,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Ensures chart resizes on window change
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                        },
                        ticks: {
                            maxTicksLimit: 10,
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Average Price (₹)',
                        },
                        beginAtZero: true,
                    }
                }
            }
        });

        toggleLoading(false);
    } catch (error) {
        toggleLoading(false);
        console.error('Error fetching historical data:', error);
        showError('An error occurred while fetching historical data.');
    }
};

// Add event listener for downloading the chart as an image
document.getElementById('downloadBtn').addEventListener('click', () => {
    const canvas = document.getElementById('priceTrendChart');
    const imageType = document.getElementById('imageTypeDropdown').value;
    const link = document.createElement('a');

    link.href = canvas.toDataURL(`image/${imageType}`, 2.0);
    link.download = `Price_Trend.${imageType}`;
    link.click();

    alert('Chart downloaded successfully!');
});

// Initial fetch to load the vegetable dropdown
fetchVegetables();
