# 🤖 AI/ML Component - Fake News Detection

This directory contains the machine learning pipeline for detecting fake news articles using Natural Language Processing and supervised learning algorithms.

## 📁 Directory Structure

```
ai/
├── notebook0901f0d4b8.ipynb     # Main ML training notebook
├── requirements.txt             # ML-specific dependencies
├── dataset/                     # Training datasets
│   ├── Fake.csv                # Fake news samples
│   └── True.csv                # Real news samples
└── models/                      # Trained model storage
    ├── .gitkeep                # Directory placeholder
    ├── random_forest_model.sav  # Random Forest classifier
    ├── logistic_regression_model.sav  # Logistic Regression classifier
    └── tfidf_vectorizer.sav     # Text vectorizer
```

## 🎯 Model Performance

The notebook trains and compares two machine learning models:

### 1. **Random Forest Classifier**
- **Algorithm**: Ensemble method with 400 trees
- **Features**: TF-IDF vectorized text
- **Preprocessing**: Text cleaning, stopword removal
- **Performance**: ~95%+ accuracy (typical)

### 2. **Logistic Regression**
- **Algorithm**: Linear classification with L2 regularization
- **Solver**: SAG (Stochastic Average Gradient)
- **Features**: TF-IDF vectorized text
- **Performance**: ~93%+ accuracy (typical)

## 🔬 Data Analysis Features

- **Dataset Size**: 44,898 articles (23,481 fake, 21,417 real)
- **Visualization**: 
  - Word clouds for text analysis
  - Distribution plots for labels and subjects
  - Confusion matrices for model evaluation
- **Text Processing**:
  - Remove Twitter handles and special characters
  - Convert to lowercase
  - Remove stopwords
  - TF-IDF vectorization

## 🚀 Usage

### Training Models

1. **Setup Environment** (if not already done):
```bash
pip install -r requirements.txt
```

2. **Run Jupyter Notebook**:
```bash
jupyter notebook notebook0901f0d4b8.ipynb
```

3. **Execute All Cells** to:
   - Load and explore data
   - Train both models
   - Evaluate performance
   - Save trained models

### Making Predictions

Use the built-in prediction function:

```python
# Load the prediction function from the notebook
result = predict_fake_news("Your news article text here", model_type='random_forest')
print(result)
# Output: {'prediction': 'Real', 'confidence': 87.5, 'model_used': 'random_forest'}
```

## 📊 Model Files

After training, the following files are generated:

- `models/random_forest_model.sav`: Trained Random Forest classifier
- `models/logistic_regression_model.sav`: Trained Logistic Regression classifier  
- `models/tfidf_vectorizer.sav`: Text vectorizer for preprocessing

## 🔧 Integration with Backend

The trained models can be integrated with the FastAPI backend to provide real-time fake news detection:

```python
# Example FastAPI endpoint
@app.post("/api/predict-fake-news")
async def predict_news(text: str):
    result = predict_fake_news(text, model_type='random_forest')
    return result
```

## 📈 Performance Metrics

The notebook provides comprehensive evaluation:

- **Accuracy Score**: Overall prediction accuracy
- **Confusion Matrix**: True vs predicted classifications
- **Classification Report**: Precision, recall, F1-score
- **Feature Importance**: Most influential words/features

## 🛠️ Dependencies

Core libraries used:
- `pandas`: Data manipulation and analysis
- `scikit-learn`: Machine learning algorithms
- `nltk`: Natural language processing
- `matplotlib/seaborn`: Data visualization
- `wordcloud`: Text visualization
- `numpy`: Numerical computations

## 📝 Notes

- Models are saved using Python's `pickle` module
- TF-IDF vectorization captures word importance
- Text preprocessing is crucial for model performance
- Both models provide probability scores for confidence measurement

## 🔄 Model Updates

To retrain models with new data:
1. Add new samples to `dataset/` directory
2. Run the notebook cells for data loading and preprocessing
3. Execute training cells for both models
4. Models will be automatically saved with updated weights

## 🚨 Important

- Always use the same vectorizer for preprocessing new text
- Models are specific to English language news articles
- Performance may vary with different news domains or time periods