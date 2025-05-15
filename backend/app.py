from flask import Flask, request, jsonify
import numpy as np
import cv2
from tensorflow.keras.models import load_model
from flask_cors import CORS
import traceback
import os

# Disable GPU (if needed)
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

# Load pre-trained models
soil_model = load_model('pso_optimized_model.h5')
pest_model = load_model('pest_detection_model.h5')

# Class labels
SOIL_CLASSES = ["alluvial", "black", "chalky", "clay soil", "mary", "red", "sand", "slit"]
PEST_CLASSES = ['aphid', 'armyworm', 'beetle', 'mite', 'sawfly', 'stemborer', 'stemfly']

# Soil recommendations
SOIL_RECOMMENDATIONS = {
    "alluvial": [
        "Suitable for crops like rice, wheat, sugarcane, and cotton",
        "Ensure proper irrigation for deep-rooted crops"
    ],
    "black": [
        "Great for cotton cultivation",
        "Use organic matter to retain moisture",
        "Avoid over-irrigation"
    ],
    "chalky": [
        "Best for crops like barley and oats",
        "Add organic matter to improve fertility",
        "Use cover crops to prevent erosion"
    ],
    "clay soil": [
        "Add organic matter to improve drainage",
        "Use raised beds for better root growth",
        "Avoid working soil when wet"
    ],
    "mary": [
        "Support vegetable crops and horticulture",
        "Use mulching to retain moisture"
    ],
    "slit": [
        "Avoid compaction by minimizing foot traffic",
        "Add organic matter to improve structure",
        "Use cover crops to prevent erosion"
    ],
    "red": [
        "Add fertilizers and organic compost",
        "Best for pulses and groundnut",
        "Requires proper water management"
    ],
    "sand": [
        "Add organic matter to improve water retention",
        "Use mulch to reduce water evaporation",
        "Frequent light fertilization"
    ]
}

# File settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/predict', methods=['POST'])
def predict():
    detection_type = request.form.get('detection_type')
    file = request.files.get('image')

    if not detection_type or not file:
        return jsonify({'error': 'Missing detection_type or image'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file format. Allowed formats: jpg, jpeg, png, gif'}), 400

    try:
        # Decode image
        image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400

        if detection_type == 'soil':
            image = cv2.resize(image, (224, 224))
            image = image.astype('float32') / 255.0
            input_data = np.expand_dims(image, axis=0)

            prediction = soil_model.predict(input_data)
            predicted_class = int(np.argmax(prediction, axis=1)[0])
            soil_type = SOIL_CLASSES[predicted_class]
            recommendations = SOIL_RECOMMENDATIONS.get(soil_type, ["General soil maintenance recommended"])

            return jsonify({
                'type': 'soil',
                'predicted_class': predicted_class,
                'soil_type': soil_type,
                'recommendations': recommendations
            })

        elif detection_type == 'pest':
            image = cv2.resize(image, (64, 64))
            image = image.astype('float32') / 255.0
            input_data = np.expand_dims(image, axis=0)

            prediction = pest_model.predict(input_data)
            predicted_class = int(np.argmax(prediction, axis=1)[0])
            pest_name = PEST_CLASSES[predicted_class]
            confidence = float(prediction[0][predicted_class]) * 100

            return jsonify({
                'type': 'pest',
                'predicted_class': predicted_class,
                'pest_name': pest_name,
                'confidence': confidence
            })

        else:
            return jsonify({'error': 'Invalid detection_type. Use "soil" or "pest".'}), 400

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
