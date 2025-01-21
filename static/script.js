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

function calculateMA(prices, period) {
    const ma = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            ma.push(null);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += prices[i - j];
        }
        ma.push(sum / period);
    }
    return ma;
}

function updateCharts(data) {
    console.log('Updating charts with:', data);
    
    // Calculate Moving Averages
    const ma20 = calculateMA(data.prices, 20);
    const ma50 = calculateMA(data.prices, 50);

    // Price Chart with MAs and Prediction
    const lastPrice = data.prices[data.prices.length - 1];
    const predictedPrice = data.metrics.predicted_price;
    const predictionColor = predictedPrice >= lastPrice ? '#4caf50' : '#f44336';

    // Create prediction date
    const lastDate = new Date(data.dates[data.dates.length - 1]);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);
    const predictionDate = nextDate.toISOString().split('T')[0];

    const priceTrace = {
        x: data.dates,
        y: data.prices,
        type: 'scatter',
        name: 'Price',
        line: { 
            color: '#2196f3',
            width: 2
        }
    };

    const ma20Trace = {
        x: data.dates,
        y: ma20,
        type: 'scatter',
        name: '20 MA',
        line: {
            color: '#4caf50',  // Green
            width: 1.5
        }
    };

    const ma50Trace = {
        x: data.dates,
        y: ma50,
        type: 'scatter',
        name: '50 MA',
        line: {
            color: '#f44336',  // Red
            width: 1.5
        }
    };

    const predictionTrace = {
        x: [data.dates[data.dates.length - 1], predictionDate],
        y: [lastPrice, predictedPrice],
        type: 'scatter',
        name: 'Prediction',
        line: {
            color: predictionColor,
            width: 2,
            dash: 'dash'
        }
    };

    const priceLayout = {
        height: 400,
        margin: { t: 20, r: 50, b: 40, l: 50 },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
        xaxis: {
            showgrid: true,
            gridcolor: '#e9ecef',
            gridwidth: 1,
            linecolor: '#e9ecef',
            tickfont: { 
                family: 'Montserrat',
                color: '#2c3e50' 
            }
        },
        yaxis: {
            showgrid: true,
            gridcolor: '#e9ecef',
            gridwidth: 1,
            linecolor: '#e9ecef',
            tickfont: { 
                family: 'Montserrat',
                color: '#2c3e50' 
            }
        },
        showlegend: true,
        legend: {
            font: { 
                family: 'Montserrat',
                color: '#2c3e50' 
            }
        },
        annotations: [{
            x: predictionDate,
            y: predictedPrice,
            text: `Predicted: $${predictedPrice.toFixed(2)}`,
            showarrow: true,
            arrowhead: 2,
            arrowcolor: predictionColor,
            ax: 40,
            ay: -40,
            font: { 
                family: 'Montserrat',
                color: predictionColor 
            }
        }]
    };

    console.log('Creating price chart with MAs and prediction');
    Plotly.newPlot('priceChart', [priceTrace, ma20Trace, ma50Trace, predictionTrace], priceLayout);

    // RSI Chart with Overbought/Oversold Lines
    if (data.rsi && Array.isArray(data.rsi)) {
        const rsiTrace = {
            x: data.dates,
            y: data.rsi,
            type: 'scatter',
            name: 'RSI',
            line: { 
                color: '#5c6bc0',
                width: 2
            }
        };

        const rsiLayout = {
            height: 200,
            margin: { t: 20, r: 50, b: 40, l: 50 },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white',
            xaxis: {
                showgrid: true,
                gridcolor: '#e9ecef',
                gridwidth: 1,
                linecolor: '#e9ecef',
                tickfont: { 
                    family: 'Montserrat',
                    color: '#2c3e50' 
                }
            },
            yaxis: {
                range: [0, 100],
                showgrid: true,
                gridcolor: '#e9ecef',
                gridwidth: 1,
                linecolor: '#e9ecef',
                tickfont: { 
                    family: 'Montserrat',
                    color: '#2c3e50' 
                }
            },
            shapes: [
                {
                    type: 'line',
                    y0: 70,
                    y1: 70,
                    x0: data.dates[0],
                    x1: data.dates[data.dates.length - 1],
                    line: {
                        color: '#f44336',
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
                        color: '#4caf50',
                        width: 1,
                        dash: 'dash'
                    }
                }
            ]
        };

        console.log('Creating RSI chart with indicators');
        Plotly.newPlot('rsiChart', [rsiTrace], rsiLayout);
    }

    // Volume Chart with Color-coded bars
    if (data.volume) {
        const volumeColors = data.prices.map((price, i) => {
            if (i === 0) return '#90caf9';
            return price > data.prices[i-1] ? '#4caf50' : '#f44336';
        });

        const volumeTrace = {
            x: data.dates,
            y: data.volume,
            type: 'bar',
            name: 'Volume',
            marker: { 
                color: volumeColors,
                opacity: 0.7
            }
        };

        const volumeLayout = {
            height: 200,
            margin: { t: 20, r: 50, b: 40, l: 50 },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white',
            xaxis: {
                showgrid: true,
                gridcolor: '#e9ecef',
                gridwidth: 1,
                linecolor: '#e9ecef',
                tickfont: { 
                    family: 'Montserrat',
                    color: '#2c3e50' 
                }
            },
            yaxis: {
                showgrid: true,
                gridcolor: '#e9ecef',
                gridwidth: 1,
                linecolor: '#e9ecef',
                tickfont: { 
                    family: 'Montserrat',
                    color: '#2c3e50' 
                }
            }
        };

        console.log('Creating volume chart with colored bars');
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