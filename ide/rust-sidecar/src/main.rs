mod fs_ops;
mod git_ops;
mod rpc;

use rpc::{RpcRequest, RpcResponse};
use std::io::{self, BufRead, Write};

#[tokio::main]
async fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) if !l.trim().is_empty() => l,
            _ => continue,
        };

        let req: RpcRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let resp = RpcResponse::err("?".into(), format!("parse error: {e}"));
                let json = serde_json::to_string(&resp).unwrap();
                let mut out = stdout.lock();
                writeln!(out, "{json}").ok();
                continue;
            }
        };

        let resp = dispatch(req).await;
        let json = serde_json::to_string(&resp).unwrap();
        let mut out = stdout.lock();
        writeln!(out, "{json}").ok();
    }
}

async fn dispatch(req: RpcRequest) -> RpcResponse {
    let id = req.id.clone();
    match req.method.as_str() {
        "fs.readDir" => fs_ops::read_dir(id, req.params).await,
        "fs.readFile" => fs_ops::read_file(id, req.params).await,
        "fs.writeFile" => fs_ops::write_file(id, req.params).await,
        "git.status" => git_ops::status(id, req.params).await,
        "git.log" => git_ops::log(id, req.params).await,
        "git.diff" => git_ops::diff(id, req.params).await,
        other => RpcResponse::err(id, format!("unknown method: {other}")),
    }
}
