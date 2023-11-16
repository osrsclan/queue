export type QueueConfiguration = {
    default: string;
    queues: {
        [queueName: string]: {
            connection: {
                host: string;
                port: number;
                maxRetriesPerRequest: number | null;
                enableReadyCheck: boolean;
            }
        }
    }
}