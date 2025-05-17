from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, execute
from qiskit_aer import Aer
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return 'Quantum backend is alive.'

@app.route('/quantum-move', methods=['POST'])
def quantum_move():
    try:
        data = request.json
        logger.info(f"Received request: {data}")
        
        # Extract data from request
        move = data.get('move', '')
        cell1 = data.get('cell1', 0)
        cell2 = data.get('cell2', 1)
        seed = data.get('seed', 42)
        
        logger.info(f"Processing quantum move: {move} between cells {cell1} and {cell2} with seed {seed}")

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
        
        return jsonify({
            'collapse_result': collapse_result,
            'move': move,
            'cell1': cell1,
            'cell2': cell2
        })
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({
            'error': str(e),
            'collapse_result': 0  # Default to cell1 in case of error
        }), 500

if __name__ == '__main__':
    logger.info("Starting quantum backend server on port 8080")
    app.run(host='0.0.0.0', port=8080, debug=True)
