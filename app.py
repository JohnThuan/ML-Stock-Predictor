from flask import Flask, render_template, request, jsonify
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from model import StockPredictor

app = Flask(__name__)
predictor = StockPredictor()

def calculate_rsi(data, periods=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def clean_nan_values(data):
    """Convert NaN values to None for JSON serialization"""
    if isinstance(data, (np.float64, np.float32, float)):
        return None if np.isnan(data) else float(data)
    elif isinstance(data, (list, np.ndarray)):
        return [clean_nan_values(x) for x in data]
    elif isinstance(data, dict):
        return {k: clean_nan_values(v) for k, v in data.items()}
    return data

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        symbol = data['symbol'].upper().strip()
        
        if symbol == 'GSPC':
            symbol = '^GSPC'
            
        stock = yf.Ticker(symbol)
        info = stock.info
        
        # Get stock info
        stock_info = {
            'name': info.get('longName', symbol),
            'sector': info.get('sector', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'market_cap': info.get('marketCap', 'N/A'),
            'pe_ratio': info.get('forwardPE', 'N/A'),
            'description': info.get('longBusinessSummary', 'No description available')
        }
        
        months = int(data.get('months', 6))
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months*30)
        
        # Get historical data
        hist = stock.history(start=start_date, end=end_date)
        
        if hist.empty:
            return jsonify({'error': f'No data found for symbol {symbol}'})
            
        # Calculate metrics
        closing_prices = hist['Close'].values
        prediction = predictor.predict(closing_prices)
        
        # Calculate RSI
        rsi = calculate_rsi(hist['Close']).fillna(0)  # Fill NaN with 0
        
        # Calculate daily returns
        returns = hist['Close'].pct_change().fillna(0) * 100  # Fill NaN with 0
        
        # Prepare response data
        response_data = {
            'dates': hist.index.strftime('%Y-%m-%d').tolist(),
            'prices': hist['Close'].tolist(),
            'volume': hist['Volume'].fillna(0).tolist(),  # Fill NaN with 0
            'rsi': rsi.tolist(),
            'returns': returns.tolist(),
            'metrics': {
                'current_price': float(hist['Close'].iloc[-1]),
                'predicted_price': float(prediction),
                'price_change': float(((hist['Close'].iloc[-1] - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2] * 100)),
                'rsi': float(rsi.iloc[-1])
            },
            'stock_info': stock_info  # Add stock info to response
        }
        
        # Clean NaN values before sending
        cleaned_response = clean_nan_values(response_data)
        
        return jsonify(cleaned_response)
        
    except Exception as e:
        print(f"Error: {str(e)}")  # Add debugging print
        return jsonify({'error': str(e)})

@app.route('/quick_stats', methods=['GET'])
def quick_stats():
    try:
        # Get S&P 500 current value
        sp500 = yf.Ticker('^GSPC')
        current_price = sp500.history(period='1d')['Close'].iloc[-1]
        
        return jsonify({
            'sp500_value': current_price,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        print(f"Error getting quick stats: {str(e)}")
        return jsonify({'error': str(e)})

@app.route('/how-it-works')
def how_it_works():
    return render_template('how_it_works.html')

if __name__ == '__main__':
    app.run(debug=True)