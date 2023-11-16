export abstract class Job<TParams> {
    /**
     * Handle and run the job.
     */
    abstract handle(event: TParams): Promise<void>;

    /**
     * Determine if the job should send based on parameters;
     */
    public async shouldSend(event: TParams): Promise<boolean> {
        return true;
    }

    /**
     * Do something when the job fails, specifically for this job.
     */
    public async onFailure(_error: Error, _event: TParams): Promise<void> {
        return;
    }

    /**
     * Do something when the job succeeds, specifically for this job.
     */
    public async onSuccess(_event: TParams): Promise<void> {
        return;
    }
}