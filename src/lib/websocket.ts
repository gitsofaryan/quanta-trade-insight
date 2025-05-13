
import { OrderBookData } from "./types";

export class OrderBookWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Initial delay in ms
  private url: string;
  private onMessageCallback: (data: OrderBookData) => void;
  private onConnectCallback: () => void;
  private onErrorCallback: (error: Event) => void;
  private isConnected = false;

  constructor(
    url: string,
    onMessage: (data: OrderBookData) => void,
    onConnect: () => void,
    onError: (error: Event) => void
  ) {
    this.url = url;
    this.onMessageCallback = onMessage;
    this.onConnectCallback = onConnect;
    this.onErrorCallback = onError;
  }

  connect(): void {
    try {
      console.log("Connecting to WebSocket...");
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket connected!");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectCallback();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: OrderBookData = JSON.parse(event.data);
          this.onMessageCallback(data);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.onErrorCallback(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed!");
        this.isConnected = false;
        this.reconnect();
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      this.reconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}
