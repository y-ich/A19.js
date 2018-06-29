/* global */
import { WorkerRMI } from 'worker-rmi';
import { softmax } from './utils.js';

export class NeuralNetwork extends WorkerRMI {
    async evaluate(...inputs) {
        const result = await this.invokeRM('evaluate', inputs);
        result[0] = softmax(result[0]);
        return result;
    }
}
