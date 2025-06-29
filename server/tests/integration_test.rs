use mediasoup_server::{Config, MediaSoupServer, SignalingMessage};
use serde_json::json;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::test]
async fn test_server_startup() {
    // Create a test configuration
    let config = Config {
        listen_addr: "127.0.0.1:0".parse().unwrap(), // Use random port
        http_addr: None,
        worker: mediasoup_server::config::WorkerConfig {
            num_workers: 1,
            log_level: "error".to_string(),
            log_tags: vec!["info".to_string()],
            rtc_min_port: 10000,
            rtc_max_port: 10010,
        },
        router: mediasoup_server::config::RouterConfig {
            media_codecs: vec![],
        },
        webrtc: mediasoup_server::config::WebRtcConfig {
            listen_ips: vec![mediasoup_server::config::ListenIp {
                ip: "127.0.0.1".to_string(),
                announced_ip: None,
            }],
        },
    };
    
    // Test that server can be created
    let server = MediaSoupServer::new(config).await;
    assert!(server.is_ok(), "Failed to create MediaSoup server");
}

#[tokio::test]
async fn test_signaling_message_serialization() {
    let message = SignalingMessage::request(
        "getRouterRtpCapabilities".to_string(),
        Some(json!({})),
    );
    
    // Test serialization
    let serialized = serde_json::to_string(&message);
    assert!(serialized.is_ok(), "Failed to serialize signaling message");
    
    // Test deserialization
    let deserialized: Result<SignalingMessage, _> = serde_json::from_str(&serialized.unwrap());
    assert!(deserialized.is_ok(), "Failed to deserialize signaling message");
    
    let deserialized = deserialized.unwrap();
    assert_eq!(deserialized.method, "getRouterRtpCapabilities");
    assert!(deserialized.is_request());
}

#[tokio::test]
async fn test_signaling_notification() {
    let notification = SignalingMessage::notification(
        "newProducer".to_string(),
        Some(json!({
            "id": "producer-123",
            "userId": "user-456",
            "kind": "video"
        })),
    );
    
    assert!(notification.is_notification());
    assert!(!notification.is_request());
    assert_eq!(notification.method, "newProducer");
}