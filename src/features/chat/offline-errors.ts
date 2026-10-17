export class OutboxSendError extends Error {
  constructor(public retryable: boolean) {
    super(retryable ? "Waiting to retry" : "Message could not be sent");
  }
}
