from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, execute
from qiskit.providers.aer import AerSimulator  # updated import

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return 'Quantum backend is alive.'

@app.route('/quantum-move', methods=['POST'])
def quantum_move():
    data = request.json
    seed = data.get('seed', 42)

    qc = QuantumCircuit(1, 1)
    qc.h(0)
    qc.measure(0, 0)

    backend = AerSimulator()  # use AerSimulator instead of Aer.get_backend()
    job = execute(qc, backend, shots=1, seed_simulator=int(seed))
    result = job.result().get_counts()

    collapse_result = 0 if '0' in result else 1
    return jsonify({'collapse_result': collapse_result})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
