from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='.')
CORS(app)

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/quantum-move', methods=['POST'])
def quantum_move():
    try:
        data = request.json
        logger.info(f"Received request: {data}")
        
        # Extract data from request
        seed = data.get('seed', 42)
        
        logger.info(f"Processing quantum move with seed {seed}")

        # Create and run quantum circuit
        qc = QuantumCircuit(1, 1)
        qc.h(0)  # Apply Hadamard gate to create superposition
        qc.measure(0, 0)  # Measure the qubit

        backend = Aer.get_backend('qasm_simulator')
        job = execute(qc, backend, shots=1, seed_simulator=int(seed))
        result = job.result().get_counts()
        
        logger.info(f"Quantum result: {result}")

        # Determine collapse result (0 or 1)
        collapse_result = 0 if '0' in result else 1
        logger.info(f"Collapse result: {collapse_result}")
        
        return jsonify({'collapse_result': collapse_result})
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({
            'error': str(e),
            'collapse_result': 0  # Default to 0 in case of error
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting quantum backend server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
