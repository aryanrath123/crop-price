from flask import Flask, request, jsonify, render_template
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from flask_cors import CORS

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)  # Enable CORS to allow frontend-backend communication

# Load dataset
file_path = 'vprice.csv'
df = pd.read_csv(file_path)
df['Date'] = pd.to_datetime(df['Date'])

@app.route('/')
def home():
    return render_template('model.html')  # Serve the HTML file

@app.route('/get_vegetables', methods=['GET'])
def get_vegetables():
    """Returns a list of all unique vegetables."""
    vegetables = df['Commodity'].unique().tolist()
    return jsonify(vegetables)

@app.route('/predict_price', methods=['POST'])
def predict_price():
    """Predict the price for the next day for the selected vegetable."""
    data = request.json
    selected_vegetable = data['vegetable']

    # Filter data for the selected vegetable
    veg_data = df[df['Commodity'] == selected_vegetable].copy()
    veg_data['Days'] = (veg_data['Date'] - veg_data['Date'].min()).dt.days

    X = veg_data[['Days']]
    y = veg_data['Average']

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train model
    model = LinearRegression()
    model.fit(X_train, y_train)

    # Predict next day price
    future_day = np.array([[X['Days'].max() + 1]])
    predicted_price = model.predict(future_day)[0]

    return jsonify({"predicted_price": round(predicted_price, 2)})

@app.route('/get_historical_data', methods=['POST'])
def get_historical_data():
    """Returns aggregated historical price data for a selected vegetable."""
    data = request.json
    selected_vegetable = data['vegetable']

    # Filter data for the selected vegetable
    veg_data = df[df['Commodity'] == selected_vegetable].copy()

    # Group data by month and calculate the average price
    veg_data['Month'] = veg_data['Date'].dt.to_period('M')
    monthly_avg = veg_data.groupby('Month')['Average'].mean().reset_index()
    monthly_avg['Month'] = monthly_avg['Month'].dt.to_timestamp()

    # Format data for the frontend
    historical_data = monthly_avg.rename(columns={'Month': 'Date'}).to_dict(orient='records')
    return jsonify(historical_data)

if __name__ == '__main__':
    app.run(debug=True)
