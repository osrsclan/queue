import path from 'path';
import fs from 'fs';
import Container, { Service } from "typedi";
import { QueueConfiguration } from 'types';
import { JobsOptions, Queue, Worker } from 'bullmq';
import { Job } from './job';

@Service()
export class QueueManager {
    private QUEUE_CONFIGURATION_NAME: string = 'queue.ts';

    /**
     * The queue configuration.
     */
    private configuration: QueueConfiguration;

    /**
     * The queues based off the passed in via the configuration.
     */
    private queues: Record<string, Queue> = {};

    /**
     * Construct the QueueManager class.
     */
    constructor() {
        this.initialise();
    }

    /**
     * Dispatch and run a job through BullMQ on the specified queue.
     */
    public dispatch(job: (new (...args: unknown[]) => Job<unknown>), payload: object, options: JobsOptions & { queueName?: string } = {}) {
        const queueName = options.queueName || this.configuration.default;
        const queue = this.queues[queueName];

        if (! queue) {
            throw new Error(`Queue [${queueName}] does not exist.`);
        }

        queue.add(job.name, payload, options);
    }

    /**
     * Initialise the queues.
     */
    private async initialise(): Promise<void> {
        this.configuration = await this.getQueueConfiguration();
        this.initialiseQueues();
    }

    /**
     * Initialise the queues based on what's specified in the configuration.
     */
    private initialiseQueues(): void {
        for (const name in this.configuration.queues) {
            this.queues[name] = new Queue(name, this.configuration.queues[name]);
        }

        this.listen();
    }

    /**
     * Listen and handle jobs that are fired through a specific queue.
     */
    private listen() {
        Object.keys(this.queues).forEach(queueName => {
            const worker = new Worker(queueName, async job => {
                let instance: Job<unknown>;

                try {
                    instance = Container.get(job.name) as Job<unknown>
                } catch (e) {
                    throw new Error(`Unable to create instance of [${job.name}]`);
                }

                if (await instance.shouldSend(job.data)) {
                    try {
                        await instance.handle(job.data);
                    } catch (e) {
                        instance.onFailure(e, job.data);
                    }
                }
            }, this.configuration.queues[queueName]);
        })
    }

    /**
     * Get the queue configuration from outside of the package.
     */
    private async getQueueConfiguration(): Promise<QueueConfiguration> {
        const configurationPathLocation = path.join(__dirname, 'config');
        const configurationPathFile = `${configurationPathLocation}/${this.QUEUE_CONFIGURATION_NAME}`;

        if (! fs.existsSync(configurationPathFile)) {
            throw new Error('Cannot find queue configuration file, create a queue.json inside of the config directory');        
        }

        const configuration = await import(configurationPathFile);

        return configuration.default as QueueConfiguration;
    }
}