import { OrderBookData } from "./types";

export class OrderBookWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
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
          const errorEvent = new ErrorEvent('error', {
            error,
            message: `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          this.onErrorCallback(errorEvent);
        }
      };

      this.ws.onerror = (error) => {
        const errorMessage = this.getErrorMessage(error);
        console.error("WebSocket error:", errorMessage);
        this.isConnected = false;
        
        // Create a more detailed error event
        const errorEvent = new ErrorEvent('error', {
          error: error instanceof Error ? error : new Error(errorMessage),
          message: errorMessage
        });
        
        this.onErrorCallback(errorEvent);
      };

      this.ws.onclose = (event) => {
        const closeReason = this.getCloseReason(event);
        console.log(`WebSocket closed: ${closeReason}`);
        this.isConnected = false;
        
        if (!this.intentionalClose) {
          // Create an error event for unexpected closures
          if (event.code !== 1000) {
            const errorEvent = new ErrorEvent('error', {
              message: closeReason
            });
            this.onErrorCallback(errorEvent);
          }
          this.reconnect();
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to establish WebSocket connection';
      console.error("Failed to connect to WebSocket:", errorMessage);
      const errorEvent = new ErrorEvent('error', {
        error: error instanceof Error ? error : new Error(errorMessage),
        message: errorMessage
      });
      this.onErrorCallback(errorEvent);
      this.reconnect();
    }
  }

  private getErrorMessage(error: Event): string {
    if (error instanceof ErrorEvent) {
      return error.message;
    } else if (error instanceof Event && error.target instanceof WebSocket) {
      const ws = error.target;
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return `Failed to establish connection to ${this.url}`;
        case WebSocket.CLOSING:
          return "Connection is closing";
        case WebSocket.CLOSED:
          return "Connection closed unexpectedly";
        default:
          return `WebSocket error (State: ${ws.readyState})`;
      }
    }
    return `Connection error to ${this.url}`;
  }

  private getCloseReason(event: CloseEvent): string {
    const codes: { [key: number]: string } = {
      1000: "Normal closure",
      1001: "Going away",
      1002: "Protocol error",
      1003: "Unsupported data",
      1004: "Reserved",
      1005: "No status received",
      1006: "Abnormal closure",
      1007: "Invalid frame payload data",
      1008: "Policy violation",
      1009: "Message too big",
      1010: "Mandatory extension",
      1011: "Internal server error",
      1015: "TLS handshake"
    };

    const reason = event.reason || codes[event.code] || "Unknown reason";
    return `Code: ${event.code}, Reason: ${reason}`;
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
        30000
      );
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.intentionalClose) {
          console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect();
        }
      }, delay);
    } else if (!this.intentionalClose) {
      const errorEvent = new ErrorEvent('error', {
        message: `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      });
      console.error(errorEvent.message);
      this.onErrorCallback(errorEvent);
    }
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}