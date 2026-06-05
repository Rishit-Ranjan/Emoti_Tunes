# EmotiTunes Training Pipeline

This folder contains a scaffold for building a real Audio Emotion Recognition (AER) training pipeline.

## What this project needs

1. A real emotion dataset (audio and optionally image).
2. A preprocessing pipeline to extract features from audio.
3. A model training script.
4. A way to deploy the trained model to the browser or backend.

## Recommended datasets

### Audio Emotion Recognition
- RAVDESS (speech + song): https://zenodo.org/records/1188976
- RAVDESS Kaggle mirror: https://www.kaggle.com/datasets/uwrfkaggler/ravdess-emotional-speech-audio
- CREMA-D: https://sail.usc.edu/CREMA-D/
- EMO-DB: http://emodb.bilderbar.info/
- SAVEE: http://cvssp.org/data/audio/
- TESS: https://tspace.library.utoronto.ca/handle/1807/24487

### Image Emotion Recognition
- FER-2013: https://www.kaggle.com/datasets/deadskull7/fer2013
- AffectNet: http://mohammadmahoor.com/affectnet/
- CK+: https://www.jeffcohn.net/Resources/
- RAF-DB: http://www.whdeng.cn/RAF/model1.html

> Always check each dataset's license and attribution requirements before using it in a project.

## Training pipeline overview

1. Download and unzip the dataset.
2. Preprocess audio:
   - convert to WAV
   - normalize sample rate
   - extract features like MFCCs, spectral centroid, zero crossing rate, energy
3. Train a classifier on emotion labels.
4. Save the model to `training/models/`.
5. Convert to TensorFlow.js if you want browser inference.

## How to use the scripts

```bash
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python aer_train.py --data-dir /path/to/audio_dataset --output-model models/aer_model.h5
```

### Train image emotion model

```bash
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python image_train.py --data-dir /path/to/image_dataset --output-model models/image_emotion_model.h5
```

> The image dataset directory should be organized with one subfolder per emotion label, for example `happy/`, `sad/`, `angry/`.

## Next step

- After training, export the model for browser use with `tensorflowjs_converter` or `tensorflowjs`.
- Then update `src/services/LocalMLService.js` to load the exported model instead of using synthetic or heuristic image logic.
