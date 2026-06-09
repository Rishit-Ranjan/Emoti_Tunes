import argparse
import os
from glob import glob
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras import layers, models
import librosa
from tqdm import tqdm

EMOTION_MAP = {
    '1': 'neutral',
    '2': 'happy',
    '3': 'sad',
    '4': 'angry',
    '5': 'fear',
    '6': 'disgust',
    '7': 'pleasant'
}

def extract_features(file_path, sample_rate=22050, n_mfcc=40):
    y, sr = librosa.load(file_path, sr=sample_rate, mono=True)
    y = librosa.util.normalize(y)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std = np.std(mfcc, axis=1)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    spec_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    spec_centroid_mean = np.mean(spec_centroid)
    zcr = librosa.feature.zero_crossing_rate(y)
    zcr_mean = np.mean(zcr)
    rms = librosa.feature.rms(y=y)
    rms_mean = np.mean(rms)

    features = np.concatenate([
        mfcc_mean,
        mfcc_std,
        chroma_mean,
        [spec_centroid_mean, zcr_mean, rms_mean]
    ])
    return features


def parse_ravdess_label(file_path):
    basename = os.path.basename(file_path)
    parts = basename.split('-')
    if len(parts) < 2:
        return None
    emotion_code = parts[2]
    return EMOTION_MAP.get(emotion_code)


def parse_tess_label(file_path):
    basename = os.path.basename(file_path).lower()
    parent_folder = os.path.basename(os.path.dirname(file_path)).lower()

    if 'angry' in basename or 'angry' in parent_folder:
        return 'angry'
    if 'disgust' in basename or 'disgust' in parent_folder:
        return 'disgust'
    if 'fear' in basename or 'fear' in parent_folder:
        return 'fear'
    if 'happy' in basename or 'happy' in parent_folder:
        return 'happy'
    if 'sad' in basename or 'sadness' in basename or 'sad' in parent_folder or 'sadness' in parent_folder:
        return 'sad'
    if 'neutral' in basename or 'neutral' in parent_folder:
        return 'neutral'
    if 'surprise' in basename or 'pleasant' in basename or 'surprise' in parent_folder or 'pleasant' in parent_folder:
        return 'pleasant'
    return None


def load_dataset(data_dir, dataset_type='ravdess', ext='wav'):
    samples = []
    labels = []
    search_pattern = os.path.join(data_dir, f'**/*.{ext}')

    for file_path in tqdm(glob(search_pattern, recursive=True), desc='Loading audio files'):
        if dataset_type == 'tess':
            label = parse_tess_label(file_path)
        else:
            label = parse_ravdess_label(file_path)
        if not label:
            continue
        features = extract_features(file_path)
        samples.append(features)
        labels.append(label)

    return np.array(samples), np.array(labels)


def build_model(input_shape, num_classes):
    model = models.Sequential([
        layers.Input(shape=input_shape),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.4),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def main(args):
    print('Loading dataset...')
    X, y = load_dataset(args.data_dir, dataset_type=args.dataset_type, ext=args.ext)
    if len(X) == 0:
        raise ValueError('No audio files found. Check your dataset path and extension.')

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    # Stratified split fails when any class has fewer than 2 samples.
    # Fall back to a non-stratified split in that case.
    class_counts = np.bincount(y_encoded)
    stratify = y_encoded if np.min(class_counts) >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )


    print(f'Training samples: {len(X_train)}, test samples: {len(X_test)}')
    model = build_model(input_shape=X_train.shape[1:], num_classes=len(label_encoder.classes_))

    model.fit(
        X_train,
        y_train,
        validation_data=(X_test, y_test),
        epochs=args.epochs,
        batch_size=args.batch_size,
        verbose=2
    )

    score = model.evaluate(X_test, y_test, verbose=0)
    print(f'Test loss: {score[0]:.4f}, Test accuracy: {score[1]:.4f}')

    os.makedirs(os.path.dirname(args.output_model), exist_ok=True)
    model.save(args.output_model)
    print(f'Model saved to {args.output_model}')

    label_path = os.path.join(os.path.dirname(args.output_model), 'label_encoder.npy')
    np.save(label_path, label_encoder.classes_)
    print(f'Label encoder classes saved to {label_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train an audio emotion recognition model.')
    parser.add_argument('--data-dir', required=True, help='Path to audio dataset root directory')
    parser.add_argument('--dataset-type', default='ravdess', choices=['ravdess', 'tess'], help='Dataset type to parse labels for')
    parser.add_argument('--output-model', default='training/models/aer_model.h5', help='Output path for the saved Keras model')
    parser.add_argument('--ext', default='wav', help='Audio file extension to load')
    parser.add_argument('--epochs', type=int, default=30, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Training batch size')
    args = parser.parse_args()
    main(args)
