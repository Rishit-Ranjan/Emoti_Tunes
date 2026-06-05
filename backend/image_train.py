import argparse
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models


def build_image_model(input_shape, num_classes):
    model = models.Sequential([
        layers.Input(shape=input_shape),
        layers.Rescaling(1.0 / 255),
        layers.Conv2D(32, 3, activation='relu'),
        layers.MaxPooling2D(),
        layers.Conv2D(64, 3, activation='relu'),
        layers.MaxPooling2D(),
        layers.Conv2D(128, 3, activation='relu'),
        layers.MaxPooling2D(),
        layers.Flatten(),
        layers.Dropout(0.4),
        layers.Dense(128, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0005),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def main(args):
    if not os.path.isdir(args.data_dir):
        raise ValueError(f'Data directory not found: {args.data_dir}')

    print('Loading image dataset...')
    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        args.data_dir,
        labels='inferred',
        label_mode='int',
        validation_split=args.validation_split,
        subset='training',
        seed=args.seed,
        image_size=(args.img_size, args.img_size),
        batch_size=args.batch_size
    )

    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        args.data_dir,
        labels='inferred',
        label_mode='int',
        validation_split=args.validation_split,
        subset='validation',
        seed=args.seed,
        image_size=(args.img_size, args.img_size),
        batch_size=args.batch_size
    )

    class_names = train_ds.class_names
    print(f'Found classes: {class_names}')

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    num_classes = len(class_names)
    model = build_image_model((args.img_size, args.img_size, 3), num_classes)

    model.summary()

    print('Training image emotion model...')
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        verbose=2
    )

    os.makedirs(os.path.dirname(args.output_model), exist_ok=True)
    model.save(args.output_model)
    print(f'Model saved to {args.output_model}')

    label_path = os.path.join(os.path.dirname(args.output_model), 'image_label_classes.npy')
    np.save(label_path, np.array(class_names))
    print(f'Label classes saved to {label_path}')

    if args.export_tfjs:
        tfjs_dir = args.export_tfjs
        print(f'Exporting TensorFlow.js model to {tfjs_dir}...')
        try:
            from tensorflowjs.converters import save_keras_model
            os.makedirs(tfjs_dir, exist_ok=True)
            save_keras_model(model, tfjs_dir)
            print(f'TF.js model exported to {tfjs_dir}')
        except ImportError:
            print('tensorflowjs is not installed. Install it with `pip install tensorflowjs` to export TF.js models.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train an image emotion recognition model.')
    parser.add_argument('--data-dir', required=True, help='Path to image dataset directory with subfolders per emotion label')
    parser.add_argument('--output-model', default='backend/models/image_emotion_model.h5', help='Output Keras model path')
    parser.add_argument('--img-size', type=int, default=128, help='Image size to use for training')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--epochs', type=int, default=20, help='Number of training epochs')
    parser.add_argument('--validation-split', type=float, default=0.2, help='Validation split fraction')
    parser.add_argument('--seed', type=int, default=42, help='Random seed for dataset split')
    parser.add_argument('--export-tfjs', default='', help='Directory path to export a TensorFlow.js model')
    args = parser.parse_args()
    main(args)
