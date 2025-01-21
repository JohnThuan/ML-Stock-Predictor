import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

class StockPredictor:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            random_state=42
        )
        
    def create_features(self, prices):
        df = pd.DataFrame(prices, columns=['close'])
        
        # Technical indicators
        df['SMA_5'] = df['close'].rolling(window=5).mean()
        df['SMA_20'] = df['close'].rolling(window=20).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Price changes
        df['price_change'] = df['close'].pct_change()
        df['price_change_5'] = df['close'].pct_change(periods=5)
        
        # Momentum
        df['momentum'] = df['close'] - df['close'].shift(5)
        
        # Volatility
        df['volatility'] = df['close'].rolling(window=5).std()
        
        # Fill NaN values
        df = df.fillna(method='bfill')
        
        return df

    def prepare_data(self, prices, window=10):
        # Create features
        df = self.create_features(prices)
        
        # Scale the features
        scaled_data = self.scaler.fit_transform(df)
        
        X, y = [], []
        for i in range(len(scaled_data) - window):
            X.append(scaled_data[i:(i + window)].flatten())  # Flatten the window of data
            y.append(scaled_data[i + window, 0])  # Predict next closing price
            
        return np.array(X), np.array(y)

    def predict(self, prices):
        try:
            X, y = self.prepare_data(prices)
            
            if len(X) == 0:
                raise ValueError("Not enough data points")
            
            # Split data for training
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, shuffle=False
            )
            
            # Train model
            self.model.fit(X_train, y_train)
            
            # Predict next value
            prediction_scaled = self.model.predict(X_test)[-1]
            
            # Inverse transform to get actual price
            dummy_array = np.zeros((1, len(self.create_features(prices).columns)))
            dummy_array[0, 0] = prediction_scaled
            prediction_actual = self.scaler.inverse_transform(dummy_array)[0, 0]
            
            return prediction_actual
            
        except Exception as e:
            print(f"Prediction error: {str(e)}")
            return None