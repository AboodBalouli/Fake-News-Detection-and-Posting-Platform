import pickle as pk
import re
from typing import List

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize


def _ensure_nltk_data() -> None:
    """Ensure the necessary NLTK corpora are available."""

    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)

    for resource in ["stopwords", "wordnet", "omw-1.4"]:
        try:
            nltk.data.find(f"corpora/{resource}")
        except LookupError:
            nltk.download(resource, quiet=True)


_ensure_nltk_data()

STOPWORDS = set(stopwords.words("english"))
LEMMATIZER = WordNetLemmatizer()


def _normalize_token(token: str) -> str:
    token = re.sub(r"[^a-zA-Z]", "", token)
    return token.lower()


def clean_text(text: str) -> str:
    """Preprocess raw text into a lemmatized, stopword-free string."""

    if not text:
        return ""

    tokens: List[str] = word_tokenize(text)
    processed_tokens: List[str] = []

    for token in tokens:
        normalized = _normalize_token(token)
        if not normalized or normalized in STOPWORDS:
            continue
        lemma = LEMMATIZER.lemmatize(normalized)
        if lemma:
            processed_tokens.append(lemma)

    return " ".join(processed_tokens)


def predict_fake_news(text: str):
    """Predict if a news article is fake or real using the logistic regression model."""

    model = pk.load(open("ai_models/logistic_regression_model.sav", "rb"))
    vectorizer = pk.load(open("ai_models/tfidf_vectorizer.sav", "rb"))

    cleaned_text = clean_text(text)
    text_vectorized = vectorizer.transform([cleaned_text])

    prediction = model.predict(text_vectorized)[0]
    confidence = model.predict_proba(text_vectorized)[0].max()

    result = "Real" if prediction == 1 else "Fake"

    return {
        "prediction": result,
        "confidence": round(confidence * 100, 2),
        "model_used": "logistic_regression",
    }