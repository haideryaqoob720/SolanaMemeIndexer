import { Kafka, Producer } from 'kafkajs';
import { EventEmitter } from 'events';

export class RawProducer {
  private kafka: Kafka;
  private producer: Producer;
  private stream: any;
  private readonly topic: string = 'test1';
  private isConnected: boolean = false;

  constructor(
    brokers: string[],
    clientId: string,
    geyserStream: any
  ) {
    // console.log(brokers, clientId)
    this.kafka = new Kafka({
        brokers,
        clientId: "node-app",
      retry: {
        initialRetryTime: 100,
        maxRetryTime: 30000,
        retries: 10
      }
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    this.stream = geyserStream;
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.handleStream();
    } catch (error) {
      console.error('Kafka connection failed:', error);
      throw error;
    }
  }

  private handleStream(): void {
    this.stream.on('data', async (rawData: Buffer) => {
        console.log("got data")
      if (!this.isConnected) return;

      try {
        await this.producer.send({
          topic: this.topic,
          messages: [{
            value: rawData,
            timestamp: Date.now().toString()
          }]
        });
      } catch (error) {
        console.error('Producer error:', error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }
}