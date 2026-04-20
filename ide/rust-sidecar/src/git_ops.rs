use crate::rpc::RpcResponse;
use git2::{Repository, StatusOptions};
use serde_json::{json, Value};

pub async fn status(id: String, params: Value) -> RpcResponse {
    let path = match params.get("path").and_then(Value::as_str) {
        Some(p) => p,
        None => return RpcResponse::err(id, "missing param: path"),
    };
    let repo = match Repository::open(path) {
        Ok(r) => r,
        Err(e) => return RpcResponse::err(id, e.message().to_string()),
    };
    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(str::to_string))
        .unwrap_or_else(|| "HEAD".into());

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let statuses = match repo.statuses(Some(&mut opts)) {
        Ok(s) => s,
        Err(e) => return RpcResponse::err(id, e.message().to_string()),
    };
    let entries: Vec<Value> = statuses
        .iter()
        .map(|s| {
            let status = if s.status().is_wt_new() || s.status().is_index_new() {
                "added"
            } else if s.status().is_wt_deleted() || s.status().is_index_deleted() {
                "deleted"
            } else if s.status().is_wt_modified() || s.status().is_index_modified() {
                "modified"
            } else {
                "untracked"
            };
            json!({ "path": s.path().unwrap_or(""), "status": status })
        })
        .collect();

    RpcResponse::ok(id, json!({ "branch": branch, "entries": entries }))
}

pub async fn log(id: String, params: Value) -> RpcResponse {
    let path = match params.get("path").and_then(Value::as_str) {
        Some(p) => p,
        None => return RpcResponse::err(id, "missing param: path"),
    };
    let n = params.get("n").and_then(Value::as_u64).unwrap_or(10) as usize;
    let repo = match Repository::open(path) {
        Ok(r) => r,
        Err(e) => return RpcResponse::err(id, e.message().to_string()),
    };
    let mut revwalk = match repo.revwalk() {
        Ok(r) => r,
        Err(e) => return RpcResponse::err(id, e.message().to_string()),
    };
    revwalk.push_head().ok();
    let commits: Vec<Value> = revwalk
        .take(n)
        .filter_map(|oid| {
            let oid = oid.ok()?;
            let commit = repo.find_commit(oid).ok()?;
            Some(json!({
                "hash": &oid.to_string()[..7],
                "message": commit.summary().unwrap_or(""),
                "author": commit.author().name().unwrap_or(""),
                "timestamp": commit.time().seconds()
            }))
        })
        .collect();
    RpcResponse::ok(id, json!(commits))
}

pub async fn diff(id: String, params: Value) -> RpcResponse {
    let path = match params.get("path").and_then(Value::as_str) {
        Some(p) => p,
        None => return RpcResponse::err(id, "missing param: path"),
    };
    let repo = match Repository::open(path) {
        Ok(r) => r,
        Err(e) => return RpcResponse::err(id, e.message().to_string()),
    };
    let diff = match repo.diff_index_to_workdir(None, None) {
        Ok(d) => d,
        Err(e) => return RpcResponse::err(id, e.message().to_string()),
    };
    let mut output = String::new();
    diff.print(git2::DiffFormat::Patch, |_, _, line| {
        let content = std::str::from_utf8(line.content()).unwrap_or("");
        output.push_str(content);
        true
    })
    .ok();
    RpcResponse::ok(id, json!(output))
}
