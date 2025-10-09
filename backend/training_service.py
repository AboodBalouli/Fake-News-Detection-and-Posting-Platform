from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import pickle as pk

from sqlalchemy.orm import Session

import models
from ml_service import clean_text

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "ai" / "dataset"
MODEL_DIR = BASE_DIR / "ai_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Filenames
LOGISTIC_MODEL_PATH = MODEL_DIR / "logistic_regression_model.sav"
VECTORIZER_PATH = MODEL_DIR / "tfidf_vectorizer.sav"


class TrainingException(Exception):
    """Raised when the training pipeline encounters an unrecoverable error."""


def _load_base_dataset() -> pd.DataFrame:
    """Load the original Fake/True dataset used during initial training."""

    fake_path = DATA_DIR / "Fake.csv"
    true_path = DATA_DIR / "True.csv"

    if not fake_path.exists() or not true_path.exists():
        raise TrainingException(
            "Base datasets not found. Make sure Fake.csv and True.csv exist in ai/dataset."
        )

    fake_df = pd.read_csv(fake_path)
    real_df = pd.read_csv(true_path)

    fake_df["Label"] = "fake"
    real_df["Label"] = "real"

    # Standardize the text column name
    fake_df = fake_df.rename(columns={"text": "text"})
    real_df = real_df.rename(columns={"text": "text"})

    base = pd.concat([fake_df[["text", "Label"]], real_df[["text", "Label"]]], axis=0)
    base.dropna(subset=["text", "Label"], inplace=True)

    return base


def _load_incremental_dataset(db: Session) -> pd.DataFrame:
    """Build a dataframe from admin-approved training rows stored in the database."""

    rows: List[Tuple[str, str]] = []

    training_rows = (
        db.query(models.TrainingData)
        .join(models.Post, models.TrainingData.post_id == models.Post.id)
        .all()
    )

    for training_row in training_rows:
        label = (training_row.label or "").strip().lower()
        if label not in {"fake", "real"}:
            # Skip records that don't have the expected labels
            continue

        post = training_row.post
        if not post or not post.content:
            continue

        rows.append((post.content, label))

    if not rows:
        return pd.DataFrame(columns=["text", "Label"])

    incremental_df = pd.DataFrame(rows, columns=["text", "Label"])
    incremental_df.dropna(subset=["text", "Label"], inplace=True)
    return incremental_df


def _prepare_dataset(base_df: pd.DataFrame, incremental_df: pd.DataFrame) -> pd.DataFrame:
    """Combine base and incremental datasets, clean the text, and encode labels."""

    combined = pd.concat([base_df, incremental_df], axis=0, ignore_index=True)
    combined.dropna(subset=["text", "Label"], inplace=True)

    combined["original_text"] = combined["text"].astype(str)

    # Clean text using shared utility
    combined["clean_text"] = combined["original_text"].map(clean_text)

    # Encode labels to numeric: fake -> 0, real -> 1
    label_map = {"fake": 0, "real": 1}
    combined["target"] = combined["Label"].str.strip().str.lower().map(label_map)
    combined.dropna(subset=["target"], inplace=True)

    # Deduplicate using cleaned text to avoid training on exact duplicates
    combined = combined.drop_duplicates(subset=["clean_text", "target"], keep="last")

    return combined[["original_text", "clean_text", "target"]]


def retrain_models(db: Session) -> Dict[str, float]:
    """Retrain the TF-IDF vectorizer and logistic regression model using combined data."""

    base_df = _load_base_dataset()
    incremental_df = _load_incremental_dataset(db)
    prepared_df = _prepare_dataset(base_df, incremental_df)

    if prepared_df.empty:
        raise TrainingException("Training dataset is empty after combining base and incremental data.")

    texts = prepared_df["clean_text"].tolist()
    targets = prepared_df["target"].astype(int).tolist()

    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(texts)
    y = targets

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, shuffle=True, random_state=44
    )

    # Train Logistic Regression classifier
    log_reg_model = LogisticRegression(
        penalty="l2", solver="saga", C=1.0, random_state=44, max_iter=1000
    )
    log_reg_model.fit(X_train, y_train)
    metrics = {"logistic_regression_accuracy": float(log_reg_model.score(X_test, y_test))}

    # Persist artifacts
    with open(VECTORIZER_PATH, "wb") as file:
        pk.dump(vectorizer, file)

    with open(LOGISTIC_MODEL_PATH, "wb") as file:
        pk.dump(log_reg_model, file)

    # Export the combined dataset (original text with label) for transparency
    export_df = pd.DataFrame(
        {
            "text": prepared_df["original_text"].tolist(),
            "label": ["fake" if target == 0 else "real" for target in targets],
        }
    )
    export_df.to_csv(DATA_DIR / "training_dataset_combined.csv", index=False)

    return metrics