use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

/// WebSocket signaling message for communication between client and server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalingMessage {
    pub id: Option<String>,
    pub method: String,
    pub data: Option<Value>,
}

/// Request message from client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalingRequest {
    pub id: String,
    pub method: String,
    pub data: Option<Value>,
}

/// Response message to client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalingResponse {
    pub id: String,
    pub response: Option<Value>,
    pub error: Option<String>,
}

/// Notification message to client (no response expected)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalingNotification {
    pub method: String,
    pub data: Option<Value>,
}

/// Known signaling methods matching the FoundryVTT client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignalingMethod {
    #[serde(rename = "getRouterRtpCapabilities")]
    GetRouterRtpCapabilities,
    
    #[serde(rename = "createWebRtcTransport")]
    CreateWebRtcTransport,
    
    #[serde(rename = "connectTransport")]
    ConnectTransport,
    
    #[serde(rename = "produce")]
    Produce,
    
    #[serde(rename = "consume")]
    Consume,
    
    #[serde(rename = "pauseProducer")]
    PauseProducer,
    
    #[serde(rename = "resumeProducer")]
    ResumeProducer,
}

/// Transport connection data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectTransportData {
    #[serde(rename = "transportId")]
    pub transport_id: String,
    
    #[serde(rename = "dtlsParameters")]
    pub dtls_parameters: Value,
}

/// Producer creation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProduceData {
    #[serde(rename = "transportId")]
    pub transport_id: String,
    
    pub kind: String, // "audio" or "video"
    
    #[serde(rename = "rtpParameters")]
    pub rtp_parameters: Value,
    
    #[serde(rename = "appData")]
    pub app_data: Option<Value>,
}

/// Consumer creation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumeData {
    #[serde(rename = "transportId")]
    pub transport_id: String,
    
    #[serde(rename = "producerId")]
    pub producer_id: String,
    
    #[serde(rename = "rtpCapabilities")]
    pub rtp_capabilities: Value,
}

/// WebRTC transport creation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWebRtcTransportData {
    pub producing: Option<bool>,
    pub consuming: Option<bool>,
    
    #[serde(rename = "sctpCapabilities")]
    pub sctp_capabilities: Option<Value>,
}

/// Transport creation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportCreatedResponse {
    pub id: String,
    
    #[serde(rename = "iceParameters")]
    pub ice_parameters: Value,
    
    #[serde(rename = "iceCandidates")]
    pub ice_candidates: Value,
    
    #[serde(rename = "dtlsParameters")]
    pub dtls_parameters: Value,
    
    #[serde(rename = "sctpParameters")]
    pub sctp_parameters: Option<Value>,
}

/// Producer creation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProducedResponse {
    pub id: String,
}

/// Consumer creation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumedResponse {
    pub id: String,
    
    #[serde(rename = "producerId")]
    pub producer_id: String,
    
    pub kind: String,
    
    #[serde(rename = "rtpParameters")]
    pub rtp_parameters: Value,
}

/// New producer notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewProducerNotification {
    pub id: String,
    
    #[serde(rename = "userId")]
    pub user_id: String,
    
    pub kind: String,
}

/// Producer closed notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProducerClosedNotification {
    #[serde(rename = "producerId")]
    pub producer_id: String,
}

impl SignalingMessage {
    /// Create a new request message
    pub fn request(method: String, data: Option<Value>) -> Self {
        Self {
            id: Some(Uuid::new_v4().to_string()),
            method,
            data,
        }
    }
    
    /// Create a new notification message
    pub fn notification(method: String, data: Option<Value>) -> Self {
        Self {
            id: None,
            method,
            data,
        }
    }
    
    /// Convert to response
    pub fn to_response(&self, response: Option<Value>, error: Option<String>) -> SignalingResponse {
        SignalingResponse {
            id: self.id.clone().unwrap_or_default(),
            response,
            error,
        }
    }
    
    /// Check if this is a request (has ID)
    pub fn is_request(&self) -> bool {
        self.id.is_some()
    }
    
    /// Check if this is a notification (no ID)
    pub fn is_notification(&self) -> bool {
        self.id.is_none()
    }
}