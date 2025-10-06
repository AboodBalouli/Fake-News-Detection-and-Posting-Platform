import pickle as pk
import re

def clean_text(text):
    # Remove Twitter handles starting with '@'
    text = re.sub(r'@\w+', '', text)
    # Remove non-alphanumeric characters and extra whitespace
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    # Convert multiple whitespace characters to a single space
    text = re.sub(r'\s+', ' ', text)
    # Convert the text to lowercase
    text = text.lower()
    return text

def predict_fake_news(text, model_type='random_forest'):
    """
    Predict if a news article is fake or real
    
    Args:
        text (str): The news article text
        model_type (str): 'random_forest' or 'logistic_regression'
    
    Returns:
        dict: Prediction result with confidence
    """
    # Load the saved models
    if model_type == 'random_forest':
        model = pk.load(open('ai_models/random_forest_model.sav', 'rb'))
    else:
        model = pk.load(open('ai_models/logistic_regression_model.sav', 'rb'))
    
    # Load the vectorizer
    vectorizer = pk.load(open('ai_models/tfidf_vectorizer.sav', 'rb'))
    
    # Clean the text
    cleaned_text = clean_text(text)
    
    # Vectorize the text
    text_vectorized = vectorizer.transform([cleaned_text])
    
    # Make prediction
    prediction = model.predict(text_vectorized)[0]
    confidence = model.predict_proba(text_vectorized)[0].max()
    
    # Convert prediction to readable format
    result = "Real" if prediction == 1 else "Fake"
    
    return {
        "prediction": result,
        "confidence": round(confidence * 100, 2),
        "model_used": model_type
    }