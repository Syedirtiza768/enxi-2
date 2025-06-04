export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  protected async withLogging<T>(
    method: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Simply execute the operation without any logging
    return operation();
  }
}