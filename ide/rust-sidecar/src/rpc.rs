use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct RpcRequest {
    pub id: String,
    pub method: String,
    pub params: Value,
}

#[derive(Debug, Serialize)]
pub struct RpcResponse {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RpcEvent {
    pub event: String,
    pub data: Value,
}

impl RpcResponse {
    pub fn ok(id: String, result: Value) -> Self {
        Self { id, result: Some(result), error: None }
    }

    pub fn err(id: String, error: impl Into<String>) -> Self {
        Self { id, result: None, error: Some(error.into()) }
    }
}
