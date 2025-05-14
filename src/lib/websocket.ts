import { OrderBookData } from "./types";

export class OrderBookWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5 to 10
  private reconnectDelay = 1000; // Initial delay in ms
  private url: string;
  private onMessageCallback: (data: OrderBookData) => void;
  private onConnectCallback: () => void;
  private onErrorCallback: (error: Event) => void;
  private isConnected = false;
  private intentionalClose = false;

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
      this.intentionalClose = false;
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
          this.onErrorCallback(new Event('error', { 
            bubbles: true, 
            cancelable: true 
          }));
        }
      };

      this.ws.onerror = (error) => {
        const errorMessage = this.getErrorMessage(error);
        console.error("WebSocket error:", errorMessage);
        this.isConnected = false;
        this.onErrorCallback(error);
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code} and reason: ${event.reason}`);
        this.isConnected = false;
        
        if (!this.intentionalClose) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      this.onErrorCallback(new Event('error'));
      this.reconnect();
    }
  }

  private getErrorMessage(error: Event): string {
    if (error instanceof ErrorEvent) {
      return error.message;
    } else if (error.target instanceof WebSocket) {
      const ws = error.target;
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return "Error while establishing connection";
        case WebSocket.CLOSED:
          return "Connection closed unexpectedly";
        default:
          return "Unknown WebSocket error";
      }
    }
    return "Unknown error occurred";
  }

  disconnect(): void {
    if (this.ws) {
      this.intentionalClose = true;
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.intentionalClose) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        30000 // Max delay of 30 seconds
      );
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.intentionalClose) {
          console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect();
        }
      }, delay);
    } else if (!this.intentionalClose) {
      console.error("Max reconnection attempts reached");
      this.onErrorCallback(new Event('error'));
    }
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}