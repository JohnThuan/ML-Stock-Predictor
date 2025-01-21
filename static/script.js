// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        console.log('Button found');
        analyzeBtn.addEventListener('click', function() {
            console.log('Button clicked');
            getPrediction();
        });
    } else {
        console.error('Analyze button not found');
    }
    
    // Initialize quick stats
    updateQuickStats();
    // Update quick stats every 60 seconds
    setInterval(updateQuickStats, 60000);
});

async function getPrediction() {
    console.log('Getting prediction');
    const stockSymbol = document.getElementById('stockSymbol').value;
    const timeframe = document.getElementById('timeframe').value;
    const loading = document.getElementById('loading');

    if (!stockSymbol) {
        showNotification('Please enter a stock symbol', 'error');
        return;
    }

    // Show loading animation
    loading.style.display = 'block';

    try {
        console.log('Sending request for:', stockSymbol);
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                symbol: stockSymbol,
                months: parseInt(timeframe)
            })
        });

        const data = await response.json();
        console.log('Raw data received:', data);

        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }

        // Update UI with received data
        if (data.prices && data.dates) {
            console.log('Updating charts with data');
            updateCharts(data);
            if (data.metrics) {
                console.log('Updating metrics');
                updateMetrics(data.metrics);
            }
            if (data.stock_info) {
                console.log('Updating stock info');
                updateStockInfo(data.stock_info);
            }
        } else {
            console.error('Missing required data properties:', data);
            showNotification('Invalid data received from server', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('Error fetching data', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

function updateCharts(data) {
    console.log('Updating charts with:', data);
    
    // Price Chart
    const priceTrace = {
        x: data.dates,
        y: data.prices,
        type: 'scatter',
        name: 'Price',
        line: { 
            color: '#2962ff',
            width: 2
        }
    };

    const layout = {
        height: 400,
        margin: { t: 20, r: 50, b: 40, l: 50 },
        xaxis: { showgrid: true },
        yaxis: { showgrid: true }
    };

    Plotly.newPlot('priceChart', [priceTrace], layout);

    // RSI Chart
    if (data.rsi && Array.isArray(data.rsi)) {
        console.log('Creating RSI chart with data:', data.rsi);
        const rsiTrace = {
            x: data.dates,
            y: data.rsi,
            type: 'scatter',
            name: 'RSI',
            line: { color: '#673ab7' }
        };

        const rsiLayout = {
            height: 200,
            margin: { t: 20, r: 50, b: 40, l: 50 },
            yaxis: {
                range: [0, 100],
                showgrid: true,
                title: 'RSI'
            },
            shapes: [
                {
                    type: 'line',
                    y0: 70,
                    y1: 70,
                    x0: data.dates[0],
                    x1: data.dates[data.dates.length - 1],
                    line: {
                        color: 'red',
                        width: 1,
                        dash: 'dash'
                    }
                },
                {
                    type: 'line',
                    y0: 30,
                    y1: 30,
                    x0: data.dates[0],
                    x1: data.dates[data.dates.length - 1],
                    line: {
                        color: 'green',
                        width: 1,
                        dash: 'dash'
                    }
                }
            ]
        };

        Plotly.newPlot('rsiChart', [rsiTrace], rsiLayout);
    } else {
        console.error('RSI data missing or invalid:', data.rsi);
    }

    // Volume Chart
    if (data.volume) {
        const volumeTrace = {
            x: data.dates,
            y: data.volume,
            type: 'bar',
            name: 'Volume',
            marker: { color: '#90caf9' }
        };

        const volumeLayout = {
            height: 200,
            margin: { t: 20, r: 50, b: 40, l: 50 },
            yaxis: {
                title: 'Volume'
            }
        };

        Plotly.newPlot('volumeChart', [volumeTrace], volumeLayout);
    }
}

function updateMetrics(metrics) {
    console.log('Updating metrics with:', metrics);
    
    if (metrics.current_price !== undefined) {
        const currentPrice = document.getElementById('currentPrice');
        if (currentPrice) {
            currentPrice.textContent = `$${metrics.current_price.toFixed(2)}`;
        }
    }

    if (metrics.predicted_price !== undefined) {
        const predictedPrice = document.getElementById('predictedPrice');
        if (predictedPrice) {
            predictedPrice.textContent = `$${metrics.predicted_price.toFixed(2)}`;
        }
    }

    if (metrics.rsi !== undefined) {
        const rsiValue = document.getElementById('rsiValue');
        if (rsiValue) {
            rsiValue.textContent = metrics.rsi.toFixed(2);
        }
    }

    if (metrics.price_change !== undefined) {
        const priceChange = document.getElementById('priceChange');
        if (priceChange) {
            const changePercent = metrics.price_change;
            priceChange.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
            priceChange.className = `change ${changePercent >= 0 ? 'positive' : 'negative'}`;
        }
    }
}

function createPlotlyChart(data) {
const trace = {
    x: data.dates,
    y: data.prices,
    type: 'scatter',
    mode: 'lines',
    name: 'Stock Price',
    line: {
        color: 'rgb(75, 192, 192)',
        width: 2
    }
};

const layout = {
    title: 'Historical Stock Prices',
    xaxis: {
        title: 'Date',
        showgrid: true
    },
    yaxis: {
        title: 'Price ($)',
        showgrid: true
    },
    margin: {
        l: 50,
        r: 50,
        t: 50,
        b: 50
    }
};

Plotly.newPlot('stockChart', [trace], layout);
}

function updateStockInfo(info) {
    console.log('Updating stock info:', info);
    
    // Update company name
    const stockName = document.getElementById('stockName');
    if (stockName) {
        stockName.textContent = info.name || 'Stock Info';
    }

    // Update sector
    const sector = document.getElementById('sector');
    if (sector) {
        sector.textContent = info.sector || 'N/A';
    }

    // Update industry
    const industry = document.getElementById('industry');
    if (industry) {
        industry.textContent = info.industry || 'N/A';
    }

    // Update market cap with formatting
    const marketCap = document.getElementById('marketCap');
    if (marketCap) {
        marketCap.textContent = formatMarketCap(info.market_cap);
    }

    // Update P/E ratio
    const peRatio = document.getElementById('peRatio');
    if (peRatio) {
        peRatio.textContent = info.pe_ratio ? info.pe_ratio.toFixed(2) : 'N/A';
    }

    // Update company description if available
    const companyDescription = document.getElementById('companyDescription');
    if (companyDescription && info.description) {
        companyDescription.textContent = info.description;
    }
}

function formatMarketCap(value) {
    if (!value || value === 'N/A') return 'N/A';
    
    if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

async function updateQuickStats() {
    try {
        // Get S&P 500 data
        const response = await fetch('/quick_stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        // Update S&P 500 value
        const sp500Element = document.getElementById('sp500Value');
        if (sp500Element && data.sp500_value) {
            sp500Element.textContent = `$${data.sp500_value.toFixed(2)}`;
        }
        
        // Update market status
        const marketStatusElement = document.getElementById('marketStatus');
        if (marketStatusElement) {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const isWeekday = now.getDay() > 0 && now.getDay() < 6;
            const isMarketHours = (hours > 9 || (hours === 9 && minutes >= 30)) && hours < 16;
            
            if (isWeekday && isMarketHours) {
                marketStatusElement.textContent = 'Market Open';
                marketStatusElement.className = 'status-open';
            } else {
                marketStatusElement.textContent = 'Market Closed';
                marketStatusElement.className = 'status-closed';
            }
        }
        
        // Update last updated time
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            lastUpdatedElement.textContent = now.toLocaleTimeString();
        }
        
    } catch (error) {
        console.error('Error updating quick stats:', error);
    }
} 