use crate::rpc::RpcResponse;
use serde_json::{json, Value};
use std::fs;

pub async fn read_dir(id: String, params: Value) -> RpcResponse {
    let path = match params.get("path").and_then(Value::as_str) {
        Some(p) => p.to_string(),
        None => return RpcResponse::err(id, "missing param: path"),
    };

    match build_file_tree(&path, 3) {
        Ok(tree) => RpcResponse::ok(id, tree),
        Err(e) => RpcResponse::err(id, e.to_string()),
    }
}

fn build_file_tree(path: &str, depth: usize) -> Result<Value, std::io::Error> {
    if depth == 0 {
        return Ok(json!([]));
    }
    let entries = fs::read_dir(path)?;
    let mut nodes = vec![];

    let mut items: Vec<_> = entries.filter_map(Result::ok).collect();
    items.sort_by_key(|e| {
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        (!is_dir, e.file_name().to_string_lossy().to_lowercase())
    });

    for entry in items {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let entry_path = entry.path().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

        if is_dir {
            let children = build_file_tree(&entry_path, depth - 1).unwrap_or(json!([]));
            nodes.push(json!({ "name": name, "path": entry_path, "kind": "dir", "children": children }));
        } else {
            nodes.push(json!({ "name": name, "path": entry_path, "kind": "file" }));
        }
    }
    Ok(json!(nodes))
}

pub async fn read_file(id: String, params: Value) -> RpcResponse {
    let path = match params.get("path").and_then(Value::as_str) {
        Some(p) => p.to_string(),
        None => return RpcResponse::err(id, "missing param: path"),
    };
    match fs::read_to_string(&path) {
        Ok(content) => RpcResponse::ok(id, json!(content)),
        Err(e) => RpcResponse::err(id, e.to_string()),
    }
}

pub async fn write_file(id: String, params: Value) -> RpcResponse {
    let path = match params.get("path").and_then(Value::as_str) {
        Some(p) => p.to_string(),
        None => return RpcResponse::err(id, "missing param: path"),
    };
    let text = match params.get("text").and_then(Value::as_str) {
        Some(t) => t.to_string(),
        None => return RpcResponse::err(id, "missing param: text"),
    };
    if let Some(parent) = std::path::Path::new(&path).parent() {
        fs::create_dir_all(parent).ok();
    }
    match fs::write(&path, &text) {
        Ok(_) => RpcResponse::ok(id, json!({ "written": true })),
        Err(e) => RpcResponse::err(id, e.to_string()),
    }
}
